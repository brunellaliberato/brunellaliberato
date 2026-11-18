/**
 * Corte de live (streamer em cima, jogo embaixo) — só com vídeo AUTORIZADO (manifesto em rights/).
 * Uso: npx tsx scripts/corte-live.ts <video> <rights.json> --game x,y,w,h [--cam x,y,w,h] --streamer @x --credit "..." [--top 3] [--lang pt] [--hooks hooks.json]
 * Saída: entregas/cortes-live/<nome>-<id>.mp4 + .json (motivo da escolha, transcrição) para revisão humana.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { paths } from '../src/core/config.js';

const argv = process.argv.slice(2);
const [video, rights] = argv;
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i > 0 ? argv[i + 1] : d; };
if (!video || !rights || !opt('game') || !opt('streamer') || !opt('credit')) throw new Error('uso: corte-live.ts <video> <rights.json> --game x,y,w,h [--cam x,y,w,h] --streamer @x --credit "..."');
const name = basename(video).replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const work = join(paths.output, `live-${name}`);
const py = (script: string, a: string[]) => {
  const r = spawnSync(paths.python, [join(paths.clipEngine, script), ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  if (r.status !== 0) throw new Error(`${script} falhou`);
  return r.stdout;
};
py('clipper.py', ['analyze', video, '--rights', rights, '--out', work, '--top', opt('top', '3')!, ...(opt('lang') ? ['--lang', opt('lang')!] : [])]);
const pub = join(paths.studio, 'public');
if (!existsSync(join(pub, 'sfx/whoosh.wav'))) py('sfx.py', [join(pub, 'sfx')]); // efeitos são gerados, não versionados
const made: string[] = JSON.parse(py('livecut_prep.py', [work, pub, '--cam', opt('cam', 'none')!, '--game', opt('game')!, '--streamer', opt('streamer')!, '--credit', opt('credit')!, ...(opt('hooks') ? ['--hooks', opt('hooks')!] : [])]).trim().split('\n').pop()!);

const { bundle } = await import('@remotion/bundler');
const { renderMedia, selectComposition } = await import('@remotion/renderer');
const be = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({ entryPoint: join(paths.studio, 'src/index.ts'), publicDir: pub });
const dest = join(paths.entregas, 'cortes-live');
mkdirSync(dest, { recursive: true });
for (const f of made) {
  const props = JSON.parse(readFileSync(f, 'utf8'));
  const composition = await selectComposition({ serveUrl, id: 'LiveCut', inputProps: props, browserExecutable: existsSync(be) ? be : null });
  const raw = join(work, `raw-${props._candidate.id}.mp4`);
  await renderMedia({ composition, serveUrl, codec: 'h264', crf: 18, outputLocation: raw, inputProps: props, browserExecutable: existsSync(be) ? be : null, concurrency: 4 });
  const out = join(dest, `${name}-${props._candidate.id}.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  unlinkSync(raw);
  rmSync(join(pub, props.src), { force: true });
  execFileSync('cp', [f, out.replace(/\.mp4$/, '.json')]);
  console.log(`✔ ${out}  (score ${props._candidate.score}: ${props._candidate.reason.join('; ')})`);
}
rmSync(serveUrl, { recursive: true, force: true });
