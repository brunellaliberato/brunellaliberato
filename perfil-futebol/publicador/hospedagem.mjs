// O Instagram busca cada mídia por um link público. Este módulo copia o vídeo
// e a capa do post para um Worker só de arquivos estáticos e publica o Worker.
// Adaptado do publicador do @ojogoasclaras.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_MIDIA = join(AQUI, 'midia');
const PUBLICO = join(PASTA_MIDIA, 'public');
const WRANGLER = join(AQUI, '..', 'node_modules', '.bin', 'wrangler');

const LIMITE_BYTES = 23 * 1024 * 1024;

function comprimir(origem, destino) {
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', origem], { encoding: 'utf8' }));
  const kbps = Math.floor((LIMITE_BYTES * 8) / dur / 1000) - 250; // sobra para o áudio (192k) e o contêiner
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', origem,
    '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`,
    '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', destino,
  ]);
  if (statSync(destino).size > 25 * 1024 * 1024) throw new Error('Mesmo comprimido, o vídeo passou de 25 MB.');
}

const paraJpeg = (origem, destino) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', origem, '-q:v', '2', destino]);

// Copia o vídeo (e a capa, em JPEG: a API não aceita PNG) para public/<pasta>/.
// A pasta tem um código aleatório, para o link não ser adivinhável.
export function prepararMidias(post, pastaDaFila) {
  const destino = join(PUBLICO, post.pasta);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });

  const video = resolve(pastaDaFila, post.video);
  if (!existsSync(video)) throw new Error(`Vídeo não encontrado: ${post.video}`);
  if (extname(video).toLowerCase() !== '.mp4') throw new Error(`O vídeo precisa ser MP4: ${post.video}`);
  // A hospedagem aceita até 25 MiB por arquivo. Acima de 23 MiB, recomprime no tamanho certo
  // (o Instagram recomprime tudo de qualquer jeito); abaixo disso, copia como está.
  if (statSync(video).size <= LIMITE_BYTES) copyFileSync(video, join(destino, 'video.mp4'));
  else comprimir(video, join(destino, 'video.mp4'));

  let capa = null;
  if (post.capa) {
    const origem = resolve(pastaDaFila, post.capa);
    if (!existsSync(origem)) throw new Error(`Capa não encontrada: ${post.capa}`);
    paraJpeg(origem, join(destino, 'capa.jpg'));
    capa = `${post.pasta}/capa.jpg`;
  }
  return { video: `${post.pasta}/video.mp4`, capa };
}

export function removerMidias(pasta) {
  if (pasta) rmSync(join(PUBLICO, pasta), { recursive: true, force: true });
}

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Página que o aviso abre no celular: vídeo, capa, legenda, horário e os botões.
export function escreverPrevia({ post, quando, pausaCodigo }) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Prévia · ${esc(post.tema ?? post.id)}</title>
<style>
body{margin:0;background:#0d0d0d;color:#f2f2f2;font:17px/1.5 system-ui,sans-serif}
main{max-width:520px;margin:auto;padding:24px 16px 120px}
h1{font-size:22px;line-height:1.25;margin:0 0 4px}
.quando{color:#a8a8a8;margin:0 0 20px}
video{width:100%;border-radius:10px;background:#000;display:block}
.capa{width:45%;border-radius:8px;display:block;margin-top:8px}
pre{white-space:pre-wrap;font:inherit;background:#1a1a1a;border:1px solid #2c2c2c;border-radius:8px;padding:14px}
.botoes{position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;padding:12px 16px;background:#0d0d0d;border-top:1px solid #2c2c2c}
.botoes form{flex:1}
button{width:100%;padding:14px;border:0;border-radius:8px;font:600 16px system-ui;cursor:pointer}
.cancelar{background:#c0261b;color:#fff}.pausar{background:#f2f2f2;color:#0d0d0d}
</style></head><body><main>
<h1>${esc(post.tema ?? post.id)}</h1>
<p class="quando">Reels · sai em ${esc(quando)}</p>
<video src="video.mp4" controls playsinline preload="metadata"></video>
${post.capa ? '<h2>Capa</h2><img class="capa" src="capa.jpg" alt="">' : ''}
<h2>Legenda</h2><pre>${esc(post.legenda)}</pre>
<p>Se nada for feito, o post sai sozinho no horário.</p>
</main>
<div class="botoes">
<form method="post" action="/api/cancelar/${post.codigo}" onsubmit="return confirm('Cancelar este post?')"><button class="cancelar">Cancelar post</button></form>
<form method="post" action="/api/pausar/${pausaCodigo}" onsubmit="return confirm('Pausar TODAS as publicações?')"><button class="pausar">Pausar tudo</button></form>
</div></body></html>`;
  writeFileSync(join(PUBLICO, post.pasta, 'index.html'), html);
  return `${post.pasta}/`;
}

// Publica o Worker com o que estiver em public/ e devolve a URL base.
export function publicarHospedagem() {
  mkdirSync(PUBLICO, { recursive: true });
  // O wrangler não publica pasta de assets vazia.
  if (!existsSync(join(PUBLICO, 'index.html'))) writeFileSync(join(PUBLICO, 'index.html'), '<!doctype html><title>ok</title>');
  const saida = execFileSync(WRANGLER, ['deploy', '--config', join(PASTA_MIDIA, 'wrangler.jsonc')], {
    cwd: PASTA_MIDIA,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = saida.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0] ?? process.env.MIDIA_URL;
  if (!url) throw new Error('Não achei a URL do Worker de mídia na saída do wrangler.');
  return url;
}

// Confere que cada link responde antes de mandar para o Instagram.
export async function conferirLinks(urls, tentativas = 12) {
  for (const url of urls) {
    for (let i = 1; ; i++) {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) break;
      if (i >= tentativas) throw new Error(`Link de mídia não está no ar (${r.status}): ${url}`);
      await new Promise((ok) => setTimeout(ok, 5000));
    }
  }
}
