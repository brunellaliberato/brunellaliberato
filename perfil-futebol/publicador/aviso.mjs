// Avisos no WhatsApp da dona do perfil, pelo CallMeBot (mesma integração do
// publicador do @ojogoasclaras). Configuração no .env: CALLMEBOT_PHONE e
// CALLMEBOT_APIKEY. O WhatsApp não tem botões: o aviso leva o link da prévia,
// onde ficam "Cancelar post" e "Pausar tudo". Falha no aviso nunca derruba o ciclo.

const CALLMEBOT = 'https://api.callmebot.com/whatsapp.php';

async function enviar(texto) {
  const numero = process.env.CALLMEBOT_PHONE?.trim();
  const chave = process.env.CALLMEBOT_APIKEY?.trim();
  if (!numero || !chave) {
    console.error('  (aviso não enviado: CALLMEBOT_PHONE ou CALLMEBOT_APIKEY faltando no .env)');
    return false;
  }
  const url = new URL(CALLMEBOT);
  url.search = new URLSearchParams({ phone: numero, text: texto, apikey: chave }).toString();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const corpo = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const ok = r.ok && /queued|sent/i.test(corpo);
    if (!ok) console.error(`  (aviso não enviado: ${r.status} ${corpo.slice(0, 160)})`);
    return ok;
  } catch (e) {
    console.error(`  (aviso não enviado: ${e.message})`);
    return false;
  }
}

export function avisarAgendado({ post, quando, previaUrl }) {
  return enviar(
    `⚽ *@portrasdolance agendado: ${post.tema ?? post.id}*\n` +
      `Reels sai em ${quando}. Se nada for feito, publica sozinho.\n\n` +
      `Ver prévia (com os botões Cancelar e Pausar):\n${previaUrl}`,
  );
}

export function avisarProblema({ titulo, texto }) {
  return enviar(`⚠️ *@portrasdolance: ${titulo}*\n${texto.slice(0, 1500)}`);
}

export function avisarPublicado({ post, permalink }) {
  return enviar(`✅ *@portrasdolance publicado: ${post.tema ?? post.id}*\n${permalink}`);
}

export const avisoConfigurado = () => Boolean(process.env.CALLMEBOT_PHONE?.trim() && process.env.CALLMEBOT_APIKEY?.trim());
