/** Renderiza capas 1280x720 a partir de content/seo/<id>-thumbs.json (uso: tsx scripts/render-thumbs.ts l02) */
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const id = process.argv[2];
const specs = JSON.parse(readFileSync(join(root, 'content/seo', `${id}-thumbs.json`), 'utf8'));
const pub = join(root, 'studio/public/thumbs');
mkdirSync(pub, { recursive: true });
mkdirSync(join(root, 'entregas'), { recursive: true });
const be = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
// imagens precisam existir em public/ ANTES do empacotamento
for (const s of specs) {
  const local = join(root, 'studio/public', `thumbs/${id}-${s.id}.jpg`);
  if (!existsSync(local)) execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(root, s.bg), '-vf', 'scale=-2:900', '-q:v', '2', local]);
}
const serveUrl = await bundle({ entryPoint: join(root, 'studio/src/index.ts'), publicDir: join(root, 'studio/public') });
for (const s of specs) {
  const local = `thumbs/${id}-${s.id}.jpg`;
  const inputProps = { ...s, bg: local };
  const composition = await selectComposition({ serveUrl, id: 'Thumb', inputProps, browserExecutable: existsSync(be) ? be : null });
  const out = join(root, 'entregas', `${id}-capa-${s.id}.png`);
  await renderStill({ composition, serveUrl, output: out, inputProps, browserExecutable: existsSync(be) ? be : null });
  console.log(out);
}
import { rmSync as _rm } from 'node:fs';
_rm(serveUrl, { recursive: true, force: true });
