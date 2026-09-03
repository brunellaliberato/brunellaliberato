// Cliente mínimo da Instagram Graph API (login do Instagram).
// Copiado do publicador do @ojogoasclaras; aqui o Reels aceita capa (cover_url).
// Publicar é sempre em dois passos: criar o container e depois media_publish.

const API = 'https://graph.instagram.com/v23.0';
const ESPERA_MS = 30000;
const LIMITE_ESPERA_MS = 10 * 60 * 1000;
const LIMITE_TENTATIVAS = 4;
// Códigos de "vá mais devagar" da Graph API. A chamada foi recusada, então repetir não duplica nada.
const CODIGOS_LIMITE = new Set([4, 17, 32, 613]);
const ESPERA_MAX_MS = 30 * 60 * 1000;

// A API aceitou 11 itens no ensaio de 13/10/2026; o app do Instagram permite 20.
export const MAX_ITENS_CARROSSEL = Number(process.env.IG_MAX_CARROSSEL ?? 20);

export class ErroInstagram extends Error {
  constructor(mensagem, detalhe) {
    super(mensagem);
    this.detalhe = detalhe;
  }
}

// O token vai no corpo/query, nunca na mensagem de erro.
async function chamar(token, metodo, caminho, params = {}, base = API) {
  const url = new URL(`${base}/${caminho}`);
  const corpo = new URLSearchParams({ ...params, access_token: token });
  const opcoes = { method: metodo };
  if (metodo === 'GET') url.search = corpo.toString();
  else opcoes.body = corpo;

  for (let tentativa = 1; ; tentativa++) {
    const resposta = await fetch(url, opcoes);
    const json = await resposta.json().catch(() => ({}));
    if (resposta.ok && !json.error) return json;
    const e = json.error ?? {};
    if (CODIGOS_LIMITE.has(e.code) && tentativa < LIMITE_TENTATIVAS) {
      await new Promise((r) => setTimeout(r, LIMITE_ESPERA_MS));
      continue;
    }
    const msg = e.error_user_msg || e.message || `HTTP ${resposta.status}`;
    throw new ErroInstagram(`${caminho}: ${msg}`, e);
  }
}

export function perfil(token) {
  return chamar(token, 'GET', 'me', { fields: 'user_id,username,account_type,media_count' });
}

export async function cota(token) {
  const { data } = await chamar(token, 'GET', 'me/content_publishing_limit', {
    fields: 'quota_usage,config',
  });
  const [item] = data ?? [];
  return { usados: item?.quota_usage ?? 0, limite: item?.config?.quota_total ?? null };
}

async function criarContainer(token, params) {
  const { id } = await chamar(token, 'POST', 'me/media', params);
  return id;
}

// Vídeo e carrossel ficam IN_PROGRESS um tempo; só dá para publicar com FINISHED.
async function esperarPronto(token, id) {
  const inicio = Date.now();
  while (true) {
    const { status_code, status } = await chamar(token, 'GET', id, { fields: 'status_code,status' });
    if (status_code === 'FINISHED' || status_code === 'PUBLISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') {
      throw new ErroInstagram(`O Instagram recusou a mídia (${status_code}): ${status ?? ''}`);
    }
    if (Date.now() - inicio > ESPERA_MAX_MS) {
      throw new ErroInstagram('O Instagram demorou demais para processar a mídia.');
    }
    await new Promise((r) => setTimeout(r, ESPERA_MS));
  }
}

const ehVideo = (url) => /\.mp4$/i.test(url);

function paramsMidia(url) {
  return ehVideo(url) ? { media_type: 'VIDEO', video_url: url } : { image_url: url };
}

// Cria os containers do post e devolve os ids que vão para media_publish
// (um só, exceto Stories com várias mídias: cada uma vira um story).
export async function prepararContainers(token, post, urls, urlCapa = null) {
  switch (post.tipo) {
    case 'imagem': {
      const id = await criarContainer(token, { image_url: urls[0], caption: post.legenda });
      await esperarPronto(token, id);
      return [id];
    }
    case 'reels': {
      const id = await criarContainer(token, {
        media_type: 'REELS',
        video_url: urls[0],
        caption: post.legenda,
        share_to_feed: 'true',
        ...(urlCapa ? { cover_url: urlCapa } : {}),
      });
      await esperarPronto(token, id);
      return [id];
    }
    case 'stories': {
      const ids = [];
      for (const url of urls) {
        const midia = ehVideo(url) ? { video_url: url } : { image_url: url };
        const id = await criarContainer(token, { media_type: 'STORIES', ...midia });
        await esperarPronto(token, id);
        ids.push(id);
      }
      return ids;
    }
    case 'carrossel': {
      const filhos = [];
      // Cria todos os itens antes de esperar: os vídeos processam em paralelo do lado do Instagram.
      for (const url of urls) filhos.push(await criarContainer(token, { ...paramsMidia(url), is_carousel_item: 'true' }));
      for (const id of filhos) await esperarPronto(token, id);
      const id = await criarContainer(token, {
        media_type: 'CAROUSEL',
        children: filhos.join(','),
        caption: post.legenda,
      });
      await esperarPronto(token, id);
      return [id];
    }
    default:
      throw new Error(`Tipo de post desconhecido: ${post.tipo}`);
  }
}

export async function publicarContainer(token, idContainer) {
  const { id } = await chamar(token, 'POST', 'me/media_publish', { creation_id: idContainer });
  const { permalink } = await chamar(token, 'GET', id, { fields: 'permalink' });
  return { mediaId: id, permalink };
}

// Só funciona com token de mais de 24 h; devolve um novo, válido por 60 dias.
export async function renovarToken(token) {
  const { access_token, expires_in } = await chamar(
    token,
    'GET',
    'refresh_access_token',
    { grant_type: 'ig_refresh_token' },
    'https://graph.instagram.com',
  );
  return { token: access_token, expiraEmSegundos: expires_in };
}
