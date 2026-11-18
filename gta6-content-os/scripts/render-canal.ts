/** Kit do canal: foto de perfil + banner para cada opção de nome. Uso: tsx scripts/render-canal.ts */
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const opts = [
  { id: 'historias', name: 'HISTÓRIAS DE LEONIDA', handle: '@historiasdeleonida', mark: 'HL', tagline: 'cortes, personagens e segredos de GTA 6' },
  { id: 'casos', name: 'CASOS DE LEONIDA', handle: '@casosdeleonida', mark: 'CL', tagline: 'os melhores causos de GTA 6' },
  { id: 'nacola', name: 'GTA NA COLA', handle: '@gtanacola', mark: 'NC', tagline: 'cortes e histórias de GTA 6' },
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
