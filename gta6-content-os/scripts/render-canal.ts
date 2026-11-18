/** Kit do canal: foto de perfil + banner para cada opção de nome. Uso: tsx scripts/render-canal.ts */
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const opts = [
  { id: 'gta6brasil', name: 'GTA 6 BRASIL', handle: '@gta6brasil', mark: 'G6', tagline: 'tudo de GTA 6, checado e em português' },
  { id: 'gtaconferido', name: 'GTA CONFERIDO', handle: '@gtaconferido', mark: 'GC', tagline: 'GTA 6 sem boato: notícias, gameplay e cortes' },
  { id: 'gta6nacola', name: 'GTA 6 NA COLA', handle: '@gta6nacola', mark: 'NC', tagline: 'notícias, gameplay e cortes de GTA 6' },
];
const be = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const out = join(root, 'entregas', 'canal');
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, 'studio/src/index.ts'), publicDir: join(root, 'studio/public') });
for (const o of opts) {
  const inputProps = { ...o, bg: 'canal/banner-bg.jpg' };
  for (const id of ['Avatar', 'Banner']) {
    const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable: be });
    const file = join(out, `${o.id}-${id.toLowerCase()}.png`);
    await renderStill({ composition, serveUrl, output: file, inputProps, browserExecutable: be });
    console.log(file);
  }
}
