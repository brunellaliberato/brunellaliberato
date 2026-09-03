// Publicador do @portrasdolance (Reels das séries).
//
//   node publicador/publicar.mjs ciclo                  roda tudo (o agendador do Mac chama a cada 15 min)
//   node publicador/publicar.mjs status                 perfil, cota, pausa e fila
//   node publicador/publicar.mjs pausar | retomar       botão de pausa (o retomar também desfaz a pausa do celular)
//   node publicador/publicar.mjs token                  guarda o token do Instagram no .env (digitado sem aparecer)
//   node publicador/publicar.mjs login                  login do Instagram pelo navegador (guarda o token sozinho)
//   node publicador/publicar.mjs cloudflare             guarda a chave da Cloudflare do perfil e põe a hospedagem no ar
//   node publicador/publicar.mjs nuvem                  leva token, aviso e pausa para a Cloudflare (que publica no horário)
//   node publicador/publicar.mjs aviso-teste            manda um aviso de teste para o WhatsApp
//   node publicador/publicar.mjs ensaio fila/<post>.json  cria o container no Instagram e para antes de publicar
//   node publicador/publicar.mjs agora fila/<post>.json   publica já (pede para digitar PUBLICAR)
//   node publicador/publicar.mjs renovar-token          renova o token (60 dias)
//
// Fila: um JSON por post em fila/. Caminho: pronto → agendado → publicado (ou cancelado, erro).
// "pronto" = vídeo e legenda prontos; o ciclo dá a ele o próximo dia livre no horário do config.json,
// manda o aviso no WhatsApp com a prévia e publica no horário se ninguém cancelar.

import { execFileSync, execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { avisarAgendado, avisarProblema, avisarPublicado, avisoConfigurado } from './aviso.mjs';
import { conferirLinks, escreverPrevia, prepararMidias, publicarHospedagem, removerMidias } from './hospedagem.mjs';
import * as ig from './instagram.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = join(RAIZ, '.env');
const FILA = join(RAIZ, 'fila');
const PAUSA = join(FILA, 'PAUSADO');
const TRAVA = join(FILA, '.ciclo.lock');
const HISTORICO = join(RAIZ, 'publicador', 'historico.jsonl');
const CONFIG = JSON.parse(readFileSync(join(RAIZ, 'publicador', 'config.json'), 'utf8'));
const PERFIL = 'portrasdolance';
const FUSO = '-03:00'; // Brasil sem horário de verão
const RENOVAR_APOS_DIAS = 30;
const TRAVA_VENCE_MS = 2 * 60 * 60 * 1000;
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const HORA = 60 * 60 * 1000;

if (existsSync(ENV)) process.loadEnvFile(ENV);

function token() {
  const t = process.env.IG_ACCESS_TOKEN;
  if (!t) throw new Error('IG_ACCESS_TOKEN não está no .env. Rode "npm run token".');
  return t;
}

function gravarNoEnv(chave, valor) {
  const linhas = existsSync(ENV) ? readFileSync(ENV, 'utf8').split('\n').filter(Boolean) : [];
  const resto = linhas.filter((l) => !l.startsWith(`${chave}=`));
  writeFileSync(ENV, [...resto, `${chave}=${valor}`].join('\n') + '\n', { mode: 0o600 });
  process.env[chave] = valor;
}

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);
const lerPost = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));
const salvarPost = (caminho, post) => writeFileSync(caminho, JSON.stringify(post, null, 2) + '\n');
const quando = (iso) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const codigo = () => randomBytes(16).toString('hex');

function validar(post) {
  const erros = [];
  if (!post.id) erros.push('falta "id"');
  if (post.tipo !== 'reels') erros.push(`tipo inválido: ${post.tipo} (só "reels")`);
  if (!post.video) erros.push('falta "video"');
  if (!post.legenda?.trim()) erros.push('sem legenda');
  if (post.legenda?.length > 2200) erros.push('legenda passa de 2.200 caracteres');
  if ((post.legenda?.match(/#/g) ?? []).length > 30) erros.push('mais de 30 hashtags');
  if (erros.length) throw new Error(`Post "${post.id}" inválido: ${erros.join('; ')}`);
}

function postsDaFila() {
  if (!existsSync(FILA)) return [];
  return readdirSync(FILA)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ caminho: join(FILA, f), post: lerPost(join(FILA, f)) }));
}

// ---------- pausa e cancelamento (Mac e celular) ----------

const urlApi = (acao, cod) => `${process.env.MIDIA_URL}/api/${acao}/${cod}`;

// Falha de rede aqui lança erro: na dúvida, não publica.
async function consultar(cod) {
  const r = await fetch(urlApi('estado', cod));
  if (!r.ok) throw new Error(`não consegui consultar pausa/cancelamento (${r.status})`);
  return r.json();
}

async function pausado() {
  if (existsSync(PAUSA)) return 'pausa ligada no Mac';
  if (process.env.PAUSA_CODIGO && process.env.MIDIA_URL) {
    const { pausa } = await consultar(process.env.PAUSA_CODIGO);
    if (pausa) return `pausa ligada pelo celular em ${quando(pausa)}`;
  }
  return null;
}

// ---------- hospedagem ----------

function hospedar(post) {
  const caminhos = prepararMidias(post, FILA);
  const base = publicarHospedagem();
  gravarNoEnv('MIDIA_URL', base);
  return { video: `${base}/${caminhos.video}`, capa: caminhos.capa ? `${base}/${caminhos.capa}` : null, base };
}

function garantirPausaCodigo() {
  if (!process.env.PAUSA_CODIGO) gravarNoEnv('PAUSA_CODIGO', codigo());
  return process.env.PAUSA_CODIGO;
}

// ---------- nuvem (a Cloudflare publica no horário, com o Mac desligado) ----------

const WRANGLER_CFG = join(RAIZ, 'publicador', 'midia', 'wrangler.jsonc');

// Grava uma chave no espaço do Worker. O valor passa por um arquivo temporário (some logo depois),
// para tokens não aparecerem na lista de processos.
function kvPut(chave, valor) {
  const tmp = join(tmpdir(), `kv-${codigo()}`);
  writeFileSync(tmp, typeof valor === 'string' ? valor : JSON.stringify(valor), { mode: 0o600 });
  try {
    execFileSync(join(RAIZ, 'node_modules', '.bin', 'wrangler'), ['kv', 'key', 'put', '--binding', 'FILA', '--remote', '--config', WRANGLER_CFG, chave, '--path', tmp], {
      cwd: dirname(WRANGLER_CFG),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } finally {
    rmSync(tmp, { force: true });
  }
}

// Leva para a nuvem o que ela precisa para publicar e avisar sozinha.
function sincronizarNuvem() {
  kvPut('config', {
    pausa_codigo: garantirPausaCodigo(),
    callmebot_phone: process.env.CALLMEBOT_PHONE?.trim() ?? '',
    callmebot_apikey: process.env.CALLMEBOT_APIKEY?.trim() ?? '',
  });
  kvPut('ig_token', token());
  kvPut('ig_token_renovado_em', process.env.IG_TOKEN_RENOVADO_EM ?? new Date().toISOString());
  log('Nuvem sincronizada (token, aviso e pausa).');
}

// Atualiza a fila do Mac com o que a nuvem fez (publicou, cancelou, deu erro).
async function sincronizarDaNuvem() {
  let mudou = false;
  for (const { caminho, post } of postsDaFila().filter(({ post }) => post.nuvem && post.status === 'agendado')) {
    const { post: pedido, pub } = await consultar(post.codigo);
    if (pub?.fase === 'publicado') {
      const resultado = { permalink: pub.permalink };
      salvarPost(caminho, { ...post, status: 'publicado', publicado_em: pub.publicado_em, resultado });
      appendFileSync(HISTORICO, JSON.stringify({ quando: pub.publicado_em, id: post.id, tema: post.tema, resultado, pela: 'nuvem' }) + '\n');
      removerMidias(post.pasta);
      mudou = true;
      log(`  ✓ ${post.id} publicado pela nuvem: ${pub.permalink}`);
    } else if (pub?.fase === 'cancelado' || pedido === 'cancelado') {
      if (Date.parse(post.publicar_em) <= Date.now() || pub?.fase === 'cancelado') {
        cancelar(caminho, post, 'cancelado pelo celular');
        mudou = true;
      }
    } else if (pub?.fase === 'erro' || pub?.fase === 'travado') {
      salvarPost(caminho, { ...post, status: 'erro', erro: pub.erro ?? pub.fase });
      log(`  ✗ ${post.id}: ${pub.erro ?? pub.fase}`);
    }
  }
  if (mudou) publicarHospedagem();
}

// ---------- publicação ----------

async function processar(caminho, { publicar }) {
  let post = lerPost(caminho);
  validar(post);
  if (post.status === 'publicado') throw new Error(`"${post.id}" já foi publicado.`);
  // "publicando" sem conclusão = a execução caiu no meio. Não repete sozinho para não postar duas vezes.
  if (post.status === 'publicando') {
    throw new Error(`"${post.id}" ficou em "publicando". Confira o perfil antes de tentar de novo.`);
  }

  log(`→ ${post.id}`);
  if (!post.pasta) {
    post = { ...post, pasta: `${post.id}-${codigo().slice(0, 12)}` };
    salvarPost(caminho, post);
  }
  const urls = hospedar(post);
  await conferirLinks([urls.video, ...(urls.capa ? [urls.capa] : [])]);

  const [container] = await ig.prepararContainers(token(), post, [urls.video], urls.capa);
  log('  container pronto no Instagram');
  if (!publicar) {
    log('  ENSAIO: nada foi publicado. O container expira sozinho em 24 h.');
    return null;
  }

  salvarPost(caminho, { ...post, status: 'publicando' });
  const resultado = await ig.publicarContainer(token(), container);
  const registro = { ...post, status: 'publicado', publicado_em: new Date().toISOString(), resultado };
  salvarPost(caminho, registro);
  appendFileSync(HISTORICO, JSON.stringify({ quando: registro.publicado_em, id: post.id, tema: post.tema, resultado }) + '\n');
  // O Instagram já copiou o vídeo; tira do ar.
  removerMidias(post.pasta);
  publicarHospedagem();
  log(`  ✓ publicado: ${resultado.permalink}`);
  return registro;
}

function cancelar(caminho, post, motivo) {
  salvarPost(caminho, { ...post, status: 'cancelado', motivo });
  removerMidias(post.pasta);
  log(`  ✗ ${post.id} cancelado: ${motivo}`);
}

async function publicarVencidos() {
  const vencidos = postsDaFila()
    // Posts da nuvem quem publica é a Cloudflare; o Mac só sincroniza (sincronizarDaNuvem).
    .filter(({ post }) => post.status === 'agendado' && !post.nuvem && Date.parse(post.publicar_em) <= Date.now())
    .sort((a, b) => Date.parse(a.post.publicar_em) - Date.parse(b.post.publicar_em));

  let mudouHospedagem = false;
  for (const { caminho, post } of vencidos) {
    if ((await consultar(post.codigo)).post === 'cancelado') {
      cancelar(caminho, post, 'cancelado pelo celular');
      mudouHospedagem = true;
      continue;
    }
    try {
      const registro = await processar(caminho, { publicar: true });
      await avisarPublicado({ post, permalink: registro.resultado?.permalink });
    } catch (e) {
      log(`  ✗ ${e.message}`);
      const atual = lerPost(caminho);
      if (atual.status !== 'publicando') salvarPost(caminho, { ...atual, status: 'erro', erro: e.message });
      await avisarProblema({ titulo: `Erro ao publicar ${post.tema ?? post.id}`, texto: e.message });
    }
  }
  if (mudouHospedagem) publicarHospedagem();
}

// ---------- agenda ----------

// Próximo horário livre (um post por dia), pelo menos aviso_minimo_horas à frente.
function proximoHorario(ocupados) {
  const minimo = Date.now() + CONFIG.aviso_minimo_horas * HORA;
  for (let d = 0; d < 60; d++) {
    const dia = new Date(Date.now() + d * 24 * HORA);
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dia);
    const iso = new Date(`${ymd}T${CONFIG.horario}:00${FUSO}`).toISOString();
    const semana = DIAS[new Date(`${ymd}T12:00:00${FUSO}`).getUTCDay()];
    if (!CONFIG.dias.includes(semana)) continue;
    if (Date.parse(iso) < minimo) continue;
    if (ocupados.has(ymd)) continue;
    return { iso, ymd };
  }
  throw new Error('Não achei horário livre nos próximos 60 dias.');
}

const diaDe = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

async function agendarProntos() {
  const fila = postsDaFila();
  const prontos = fila
    .filter(({ post }) => post.status === 'pronto')
    .sort((a, b) => (a.post.ordem ?? 999) - (b.post.ordem ?? 999) || a.post.id.localeCompare(b.post.id));
  if (!prontos.length) return;
  if (!avisoConfigurado()) {
    log('Há posts prontos, mas o WhatsApp não está configurado no .env. Nada foi agendado.');
    return;
  }
  const ocupados = new Set(
    fila.filter(({ post }) => ['agendado', 'publicando', 'publicado'].includes(post.status) && post.publicar_em).map(({ post }) => diaDe(post.publicar_em)),
  );
  const pausaCodigo = garantirPausaCodigo();

  for (const { caminho, post: original } of prontos) {
    try {
      validar(original);
      // "publicar_em_fixo" no post fura a fila e o aviso mínimo (só precisa estar 10 min à frente).
      const fixo = original.publicar_em_fixo && new Date(original.publicar_em_fixo);
      if (fixo && fixo.getTime() < Date.now() + 10 * 60 * 1000) throw new Error(`"publicar_em_fixo" (${quando(fixo)}) já passou ou está perto demais.`);
      const { iso, ymd } = fixo ? { iso: fixo.toISOString(), ymd: diaDe(fixo) } : proximoHorario(ocupados);
      const post = {
        ...original,
        status: 'agendado',
        nuvem: true,
        publicar_em: iso,
        codigo: original.codigo ?? codigo(),
        pasta: original.pasta ?? `${original.id}-${codigo().slice(0, 12)}`,
      };
      const midias = prepararMidias(post, FILA);
      const previa = escreverPrevia({ post, quando: quando(iso), pausaCodigo });
      const base = publicarHospedagem();
      gravarNoEnv('MIDIA_URL', base);
      await conferirLinks([`${base}/${midias.video}`, ...(midias.capa ? [`${base}/${midias.capa}`] : [])]);
      // A partir daqui a Cloudflare publica no horário, mesmo com o Mac desligado.
      kvPut(`agenda:${post.codigo}`, {
        id: post.id,
        tema: post.tema ?? post.id,
        publicar_em: iso,
        video_url: `${base}/${midias.video}`,
        capa_url: midias.capa ? `${base}/${midias.capa}` : null,
        legenda: post.legenda,
        fase: 'agendado',
      });
      salvarPost(caminho, post);
      ocupados.add(ymd);
      log(`  agendado: ${post.id} para ${quando(iso)}`);
      await avisarAgendado({ post, quando: quando(iso), previaUrl: `${base}/${previa}` });
    } catch (e) {
      log(`  ✗ ${original.id}: ${e.message}`);
      salvarPost(caminho, { ...original, status: 'erro', erro: e.message });
      await avisarProblema({ titulo: `Erro ao agendar ${original.tema ?? original.id}`, texto: e.message });
    }
  }
}

// ---------- token ----------

async function renovarSeVencendo() {
  const ultima = process.env.IG_TOKEN_RENOVADO_EM;
  if (!ultima) return gravarNoEnv('IG_TOKEN_RENOVADO_EM', new Date().toISOString());
  const dias = (Date.now() - Date.parse(ultima)) / 86_400_000;
  if (dias >= RENOVAR_APOS_DIAS) await renovar();
}

async function renovar() {
  const { token: novo, expiraEmSegundos } = await ig.renovarToken(token());
  gravarNoEnv('IG_ACCESS_TOKEN', novo);
  gravarNoEnv('IG_TOKEN_RENOVADO_EM', new Date().toISOString());
  log(`Token renovado. Vale por mais ${Math.round(expiraEmSegundos / 86_400)} dias.`);
  try { kvPut('ig_token', novo); kvPut('ig_token_renovado_em', process.env.IG_TOKEN_RENOVADO_EM); } catch (e) { log(`  (nuvem não atualizada: ${e.message})`); }
}

// O token é digitado sem aparecer na tela e vai direto para o .env.
async function guardarToken() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write('Cole o token do Instagram do @portrasdolance e aperte Enter (ele não aparece na tela): ');
  try { execSync('stty -echo', { stdio: 'inherit' }); } catch {}
  const valor = (await rl.question('')).trim();
  try { execSync('stty echo', { stdio: 'inherit' }); } catch {}
  rl.close();
  console.log('');
  if (!valor) return console.log('Nada foi colado. Token não mudou.');
  const p = await ig.perfil(valor);
  if (p.username !== PERFIL) {
    console.log(`✗ Esse token é do @${p.username}, não do @${PERFIL}. Não guardei.`);
    process.exitCode = 1;
    return;
  }
  gravarNoEnv('IG_ACCESS_TOKEN', valor);
  gravarNoEnv('IG_TOKEN_RENOVADO_EM', new Date().toISOString());
  try { sincronizarNuvem(); } catch (e) { console.log(`  (nuvem não atualizada: ${e.message})`); }
  console.log(`✓ Token do @${p.username} guardado (conta ${p.account_type}).`);
}

// ---------- login próprio do Instagram (quando o "Gerar token" da Meta não funciona) ----------

const VOLTA_LOGIN = () => `${process.env.MIDIA_URL}/api/oauth-volta`;

// Abre a tela "Permitir" do Instagram; a volta cai no Worker, que guarda o código por 10 min.
// O Mac busca o código e troca pelo token com a chave secreta do app, que fica só no .env.
async function login() {
  if (!process.env.MIDIA_URL) throw new Error('A hospedagem ainda não está no ar (rode "npm run cloudflare").');
  if (!process.env.IG_APP_SECRET) {
    const segredo = await perguntarOculto('Cole a "Chave secreta do app do Instagram" (botão Mostrar na página da Meta) e aperte Enter: ');
    if (!segredo) return console.log('Nada foi colado.');
    gravarNoEnv('IG_APP_SECRET', segredo);
  }
  const state = codigo();
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.search = new URLSearchParams({
    enable_fb_login: '0',
    client_id: CONFIG.ig_app_id,
    redirect_uri: VOLTA_LOGIN(),
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_content_publish',
    state,
  }).toString();
  console.log('\nAbrindo o Instagram no navegador. Confira se está no @portrasdolance e clique em "Permitir".');
  console.log(`Se não abrir sozinho, copie este link no navegador:\n${url}\n`);
  try { execSync(`open "${url}"`); } catch {}

  let code = null;
  for (let i = 0; i < 120 && !code; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(`${process.env.MIDIA_URL}/api/oauth/${state}`).catch(() => null);
    code = r?.ok ? (await r.json()).code : null;
  }
  if (!code) throw new Error('Não recebi a autorização em 10 minutos. Rode "npm run login" de novo.');

  const curto = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: CONFIG.ig_app_id,
      client_secret: process.env.IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: VOLTA_LOGIN(),
      code,
    }),
  }).then((r) => r.json());
  if (!curto.access_token) throw new Error(`O Instagram não trocou o código: ${curto.error_message ?? curto.error?.message ?? 'erro desconhecido'}`);

  const longo = await fetch(
    `https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: process.env.IG_APP_SECRET, access_token: curto.access_token })}`,
  ).then((r) => r.json());
  if (!longo.access_token) throw new Error(`O Instagram não deu o token de 60 dias: ${longo.error?.message ?? 'erro desconhecido'}`);

  const p = await ig.perfil(longo.access_token);
  if (p.username !== PERFIL) {
    console.log(`✗ O login foi feito com o @${p.username}, não com o @${PERFIL}. Troque de conta no Instagram e rode de novo.`);
    process.exitCode = 1;
    return;
  }
  gravarNoEnv('IG_ACCESS_TOKEN', longo.access_token);
  gravarNoEnv('IG_TOKEN_RENOVADO_EM', new Date().toISOString());
  try { sincronizarNuvem(); } catch (e) { console.log(`  (nuvem não atualizada: ${e.message})`); }
  console.log(`✓ Token do @${p.username} guardado. Vale por ${Math.round(longo.expires_in / 86_400)} dias e é renovado sozinho.`);
}

// ---------- hospedagem própria (conta Cloudflare do perfil) ----------

// Lê um valor do teclado sem mostrar na tela.
async function perguntarOculto(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(texto);
  try { execSync('stty -echo', { stdio: 'inherit' }); } catch {}
  const valor = (await rl.question('')).trim();
  try { execSync('stty echo', { stdio: 'inherit' }); } catch {}
  rl.close();
  console.log('');
  return valor;
}

// Guarda a chave da Cloudflare do perfil no .env (o wrangler usa ela no lugar do login do Mac,
// então o Jogo às Claras continua na conta dele), cria o espaço de cancelar/pausar e põe o Worker no ar.
async function prepararCloudflare() {
  const WRANGLER_CFG = join(RAIZ, 'publicador', 'midia', 'wrangler.jsonc');
  const chave = await perguntarOculto('Cole a chave (API token) da Cloudflare e aperte Enter (ela não aparece na tela): ');
  if (!chave) return console.log('Nada foi colado.');
  const api = (caminho) =>
    fetch(`https://api.cloudflare.com/client/v4/${caminho}`, { headers: { Authorization: `Bearer ${chave}` } }).then((r) => r.json());
  const contas = await api('accounts');
  if (!contas.success || !contas.result?.length) {
    console.log('✗ A Cloudflare não aceitou essa chave (ou ela não vê nenhuma conta).');
    process.exitCode = 1;
    return;
  }
  // Com mais de uma conta, só segue se o .env já disser qual usar (CLOUDFLARE_ACCOUNT_ID).
  const conta =
    contas.result.length === 1 ? contas.result[0] : contas.result.find((c) => c.id === process.env.CLOUDFLARE_ACCOUNT_ID);
  if (!conta) {
    console.log('✗ Essa chave enxerga várias contas. Limite a chave a uma conta só na Cloudflare e rode de novo:');
    for (const c of contas.result) console.log(`   - ${c.name}`);
    process.exitCode = 1;
    return;
  }
  if (/clube band/i.test(conta.name)) {
    console.log(`✗ Essa chave é da conta "${conta.name}". Use a conta própria do perfil.`);
    process.exitCode = 1;
    return;
  }
  gravarNoEnv('CLOUDFLARE_API_TOKEN', chave);
  gravarNoEnv('CLOUDFLARE_ACCOUNT_ID', conta.id);
  console.log(`✓ Chave guardada (conta "${conta.name}").`);

  let cfg = readFileSync(WRANGLER_CFG, 'utf8');
  if (cfg.includes('"PREENCHER"')) {
    const saida = execSync(`"${join(RAIZ, 'node_modules', '.bin', 'wrangler')}" kv namespace create FILA --config "${WRANGLER_CFG}"`, {
      cwd: dirname(WRANGLER_CFG),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const id = saida.match(/"id":\s*"([a-f0-9]{32})"/)?.[1] ?? saida.match(/\b([a-f0-9]{32})\b/)?.[1];
    if (!id) throw new Error(`Não achei o id do espaço criado:\n${saida}`);
    cfg = cfg.replace('"PREENCHER"', `"${id}"`);
    writeFileSync(WRANGLER_CFG, cfg);
    console.log('✓ Espaço de cancelar/pausar criado.');
  }
  garantirPausaCodigo();
  const base = publicarHospedagem();
  gravarNoEnv('MIDIA_URL', base);
  console.log(`✓ Hospedagem no ar: ${base}`);
}

// ---------- ciclo e comandos ----------

async function ciclo() {
  if (existsSync(TRAVA) && Date.now() - statSync(TRAVA).mtimeMs < TRAVA_VENCE_MS) return log('Outro ciclo ainda está rodando.');
  writeFileSync(TRAVA, String(process.pid));
  try {
    const motivo = await pausado();
    if (motivo) return log(`Publicação PAUSADA (${motivo}). Nada foi feito.`);
    await renovarSeVencendo();
    await sincronizarDaNuvem();
    await publicarVencidos();
    await agendarProntos();
  } finally {
    rmSync(TRAVA, { force: true });
  }
}

async function status() {
  if (process.env.IG_ACCESS_TOKEN) {
    const p = await ig.perfil(token());
    const c = await ig.cota(token());
    console.log(`Perfil: @${p.username} · posts: ${p.media_count}`);
    console.log(`Cota da API nas últimas 24 h: ${c.usados}${c.limite ? ` de ${c.limite}` : ''}`);
  } else {
    console.log('Perfil: (sem token ainda — rode "npm run token")');
  }
  console.log(`WhatsApp: ${avisoConfigurado() ? 'configurado' : 'NÃO configurado'}`);
  console.log(`Pausa: ${(await pausado()) ?? 'desligada'}`);
  console.log(`Horário: todo dia às ${CONFIG.horario} (${CONFIG.dias.join(', ')})`);
  const fila = postsDaFila().sort((a, b) => String(a.post.publicar_em ?? 'z').localeCompare(String(b.post.publicar_em ?? 'z')));
  for (const { post } of fila) console.log(`  ${post.status.padEnd(11)} ${post.publicar_em ? quando(post.publicar_em) : '-'.padEnd(17)}  ${post.id}`);
}

async function confirmar(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await rl.question(texto);
  rl.close();
  return resposta.trim() === 'PUBLICAR';
}

const [comando, arquivo] = process.argv.slice(2);

try {
  switch (comando) {
    case 'ciclo':
      await ciclo();
      break;
    case 'ensaio':
      await processar(resolve(arquivo), { publicar: false });
      break;
    case 'agora': {
      const post = lerPost(resolve(arquivo));
      validar(post);
      console.log(`\nVai publicar AGORA no @${PERFIL}: "${post.tema ?? post.id}".`);
      if (!(await confirmar('Digite PUBLICAR para confirmar: '))) {
        console.log('Cancelado.');
        break;
      }
      const registro = await processar(resolve(arquivo), { publicar: true });
      await avisarPublicado({ post, permalink: registro.resultado?.permalink });
      break;
    }
    case 'token':
      await guardarToken();
      break;
    case 'login':
      await login();
      break;
    case 'cloudflare':
      await prepararCloudflare();
      break;
    case 'aviso-teste': {
      const ok = await avisarProblema({ titulo: 'Teste', texto: 'Se você está vendo isto, os avisos do @portrasdolance estão funcionando.' });
      console.log(ok ? 'Aviso de teste enviado.' : 'O aviso de teste falhou.');
      break;
    }
    case 'status':
      await status();
      break;
    case 'nuvem':
      sincronizarNuvem();
      break;
    case 'pausar':
      writeFileSync(PAUSA, `Pausado em ${new Date().toISOString()}\n`);
      if (process.env.PAUSA_CODIGO && process.env.MIDIA_URL) await fetch(urlApi('pausar', process.env.PAUSA_CODIGO), { method: 'POST' });
      console.log('Publicação PAUSADA. Nada sai até você rodar "npm run retomar".');
      break;
    case 'retomar':
      rmSync(PAUSA, { force: true });
      if (process.env.PAUSA_CODIGO && process.env.MIDIA_URL) await fetch(urlApi('retomar', process.env.PAUSA_CODIGO), { method: 'POST' });
      console.log('Publicação retomada.');
      break;
    case 'renovar-token':
      await renovar();
      break;
    default:
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(2, 11).join('\n').replaceAll('//', ''));
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
