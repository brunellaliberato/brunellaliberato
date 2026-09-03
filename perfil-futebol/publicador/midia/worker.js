// Worker de mídia do @portrasdolance (cópia do Worker do @ojogoasclaras).
// Arquivos estáticos (mídias e prévias) saem de public/. As rotas /api/* guardam
// os pedidos de cancelar e pausar que vêm do celular; o publicador consulta antes de postar.
// Os códigos são aleatórios (32 hex) e só aparecem no aviso enviado à dona da conta.

const CODIGO = /^[a-f0-9]{32}$/;

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const pagina = (titulo, texto) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><body style="font:18px/1.5 system-ui;background:#f5f5f0;color:#132735;padding:32px 20px;max-width:520px;margin:auto">
<h1 style="font-size:24px">${titulo}</h1><p>${texto}</p></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, api, acao, codigo] = url.pathname.split('/');
    if (api !== 'api') return env.ASSETS.fetch(request);

    // Volta do login do Instagram (npm run login). O código de autorização fica guardado
    // por 10 min sob o "state" aleatório que o Mac gerou; o Mac busca uma vez e troca pelo token
    // usando a chave secreta do app, que nunca sai do Mac.
    if (acao === 'oauth-volta') {
      const state = url.searchParams.get('state') ?? '';
      const code = (url.searchParams.get('code') ?? '').replace(/#_$/, '');
      if (!CODIGO.test(state)) return pagina('Link inválido', 'Rode <b>npm run login</b> de novo no Mac.');
      if (!code) return pagina('Login não concluído', `O Instagram respondeu: ${url.searchParams.get('error_description') ?? 'sem autorização'}.`);
      await env.FILA.put(`oauth:${state}`, code, { expirationTtl: 600 });
      return pagina('Pronto!', 'Autorizado. Pode voltar para o Terminal do Mac.');
    }
    if (!CODIGO.test(codigo ?? '')) return json({ erro: 'código inválido' }, 400);
    if (acao === 'oauth') {
      const code = await env.FILA.get(`oauth:${codigo}`);
      if (code) await env.FILA.delete(`oauth:${codigo}`);
      return json({ code });
    }

    switch (acao) {
      case 'estado': {
        const [post, pausa, agenda] = await Promise.all([
          env.FILA.get(`post:${codigo}`),
          env.FILA.get(`pausa:${codigo}`),
          env.FILA.get(`agenda:${codigo}`, 'json'),
        ]);
        const pub = agenda && { fase: agenda.fase, permalink: agenda.permalink ?? null, erro: agenda.erro ?? null, publicado_em: agenda.publicado_em ?? null };
        return json({ post, pausa, pub });
      }
      case 'cancelar':
        if (request.method !== 'POST') return pagina('Use o botão', 'Para cancelar, use o botão da prévia ou do aviso.');
        await env.FILA.put(`post:${codigo}`, 'cancelado');
        return pagina('Post cancelado', 'Esse post não vai ser publicado.');
      case 'pausar':
        if (request.method !== 'POST') return pagina('Use o botão', 'Para pausar, use o botão do aviso.');
        await env.FILA.put(`pausa:${codigo}`, new Date().toISOString());
        return pagina('Publicação pausada', 'Nada mais sai até você rodar <b>npm run retomar</b> no Mac.');
      case 'retomar':
        if (request.method !== 'POST') return json({ erro: 'use POST' }, 405);
        await env.FILA.delete(`pausa:${codigo}`);
        return json({ ok: true });
      default:
        return json({ erro: 'ação desconhecida' }, 404);
    }
  },

  // Roda a cada 5 min na Cloudflare, com o Mac ligado ou não.
  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(publicarAgenda(env));
  },
};

// ───────────── publicação na nuvem ─────────────
// O Mac deixa cada post em "agenda:<código>" (vídeo e capa já hospedados aqui, legenda e horário).
// Fases: agendado → container (Instagram processando) → publicando → publicado (ou cancelado, erro).
// Nunca repete uma publicação que ficou em "publicando": avisa e espera alguém conferir.

const IG = 'https://graph.instagram.com/v23.0';
const ANTES_MS = 20 * 60 * 1000; // cria o container 20 min antes, para o vídeo estar processado no horário
const CONTAINER_VALE_MS = 23 * 60 * 60 * 1000;
const RENOVAR_MS = 30 * 24 * 60 * 60 * 1000;

async function ig(env, metodo, caminho, params = {}) {
  const token = await env.FILA.get('ig_token');
  if (!token) throw new Error('sem token do Instagram na nuvem');
  const url = new URL(`${IG}/${caminho}`);
  const corpo = new URLSearchParams({ ...params, access_token: token });
  const r = metodo === 'GET' ? await fetch(`${url}?${corpo}`) : await fetch(url, { method: 'POST', body: corpo });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${caminho}: ${j.error?.error_user_msg || j.error?.message || `HTTP ${r.status}`}`);
  return j;
}

async function avisar(env, texto) {
  const cfg = (await env.FILA.get('config', 'json')) ?? {};
  if (!cfg.callmebot_phone || !cfg.callmebot_apikey) return;
  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.search = new URLSearchParams({ phone: cfg.callmebot_phone, text: texto, apikey: cfg.callmebot_apikey }).toString();
  await fetch(url).catch(() => {});
}

async function renovarToken(env) {
  const desde = Date.parse((await env.FILA.get('ig_token_renovado_em')) ?? 0);
  if (Date.now() - desde < RENOVAR_MS) return;
  const token = await env.FILA.get('ig_token');
  if (!token) return;
  const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) return avisar(env, `⚠️ *@portrasdolance:* não consegui renovar o token do Instagram (${j.error?.message ?? r.status}). Rode "npm run login" no Mac.`);
  await env.FILA.put('ig_token', j.access_token);
  await env.FILA.put('ig_token_renovado_em', new Date().toISOString());
}

async function publicarAgenda(env) {
  await renovarToken(env).catch(() => {});
  const cfg = (await env.FILA.get('config', 'json')) ?? {};
  if (cfg.pausa_codigo && (await env.FILA.get(`pausa:${cfg.pausa_codigo}`))) return;

  const { keys } = await env.FILA.list({ prefix: 'agenda:' });
  for (const { name } of keys) {
    const codigo = name.slice('agenda:'.length);
    const p = await env.FILA.get(name, 'json');
    if (!p || ['publicado', 'cancelado', 'erro', 'travado', 'ensaio-ok'].includes(p.fase)) continue;
    const salvar = (mudancas) => env.FILA.put(name, JSON.stringify({ ...p, ...mudancas, atualizado_em: new Date().toISOString() }));
    const quando = Date.parse(p.publicar_em);
    if (Date.now() < quando - ANTES_MS) continue;

    try {
      if (p.fase === 'publicando') {
        await salvar({ fase: 'travado' });
        await avisar(env, `⚠️ *@portrasdolance: ${p.tema}*\nA publicação parou no meio. Confira o perfil antes de tentar de novo.`);
        continue;
      }
      if ((await env.FILA.get(`post:${codigo}`)) === 'cancelado') {
        await salvar({ fase: 'cancelado' });
        continue;
      }

      // 1) container: o Instagram baixa o vídeo e processa
      const velho = p.container_em && Date.now() - Date.parse(p.container_em) > CONTAINER_VALE_MS;
      if (p.fase === 'agendado' || velho) {
        const { id } = await ig(env, 'POST', 'me/media', {
          media_type: 'REELS',
          video_url: p.video_url,
          caption: p.legenda,
          share_to_feed: 'true',
          ...(p.capa_url ? { cover_url: p.capa_url } : {}),
        });
        await salvar({ fase: 'container', container_id: id, container_em: new Date().toISOString() });
        continue; // confere o processamento na próxima rodada
      }

      // 2) no horário, publica se o vídeo já foi processado
      if (p.fase === 'container' && Date.now() >= quando) {
        const { status_code } = await ig(env, 'GET', p.container_id, { fields: 'status_code' });
        if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`o Instagram recusou o vídeo (${status_code})`);
        if (status_code !== 'FINISHED') continue;
        // Ensaio: prova que a nuvem consegue preparar o post, sem publicar.
        if (p.ensaio) {
          await salvar({ fase: 'ensaio-ok' });
          continue;
        }
        await salvar({ fase: 'publicando' });
        const { id } = await ig(env, 'POST', 'me/media_publish', { creation_id: p.container_id });
        const { permalink } = await ig(env, 'GET', id, { fields: 'permalink' }).catch(() => ({}));
        await env.FILA.put(name, JSON.stringify({ ...p, fase: 'publicado', media_id: id, permalink, publicado_em: new Date().toISOString() }));
        await avisar(env, `✅ *@portrasdolance publicado: ${p.tema}*\n${permalink ?? ''}`);
      }
    } catch (e) {
      // "publicando" que falhou fica travado (pode ter saído); o resto tenta de novo até 3 vezes.
      const atual = (await env.FILA.get(name, 'json')) ?? p;
      if (atual.fase === 'publicando') {
        await env.FILA.put(name, JSON.stringify({ ...atual, fase: 'travado', erro: e.message }));
        await avisar(env, `⚠️ *@portrasdolance: ${p.tema}*\nErro na hora de publicar (${e.message.slice(0, 300)}). Confira o perfil.`);
        continue;
      }
      const falhas = (p.falhas ?? 0) + 1;
      if (falhas < 3) {
        await salvar({ falhas, erro: e.message });
        continue;
      }
      await salvar({ fase: 'erro', falhas, erro: e.message });
      await avisar(env, `⚠️ *@portrasdolance: erro em ${p.tema}*\n${e.message.slice(0, 600)}`);
    }
  }
}
