/**
 * MÓDULO F — VIDEO PRODUCTION (Fluxo A: vídeo original)
 * roteiro aprovado no Gate 1/2 + storyboard → voz por beat → timeline → Remotion → loudnorm → MP4
 *
 * Reprocessamento granular: cada fala é cacheada pelo hash do texto. Corrigiu uma frase?
 * Só aquele beat é re-sintetizado; o resto é reaproveitado. Legenda/visual mudam sem refazer voz.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from '../../core/config.js';
import type { Script } from '../../core/types.js';
import type { CaptionChunk, Layout, ShortProps, TimelineBeat } from '../../../studio/src/types.js';
import type { Seal } from '../../../studio/src/brand.js';

export interface Storyboard {
  scriptId: string;
  voice: string;
  beats: { layout: Layout; seal?: Seal; sourceLabel?: string }[];
  emphasis: string[];
}

const FPS = 30;
const GAP_FRAMES = 7; // respiro entre falas
const TAIL_FRAMES = 30; // segura o último quadro (loop)

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 10);

export function applyLexicon(text: string, lex: Record<string, string>): string {
  const keys = Object.keys(lex).filter((k) => !k.startsWith('_')).sort((a, b) => b.length - a.length);
  let out = text;
  for (const k of keys) out = out.replace(new RegExp(`(?<![\\wÀ-ú])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\wÀ-ú])`, 'g'), lex[k]);
  return out;
}

export interface Voice {
  id: string;
  synth(text: string, outWav: string): void;
}

/** Voz guia local e gratuita. Narração humana entra pelo mesmo contrato (arquivo por beat). */
export const piperVoice: Voice = {
  id: 'piper-pt_BR-faber-medium',
  synth(text, outWav) {
    const r = spawnSync(paths.python, ['-m', 'piper', '-m', join(paths.clipEngine, 'models/piper/pt_BR-faber-medium.onnx'), '-f', outWav, '--length-scale', '0.92', '--sentence-silence', '0.12'], {
      input: text,
      encoding: 'utf8',
    });
    if (r.status !== 0 || !existsSync(outWav)) throw new Error(`piper falhou: ${r.stderr}`);
  },
};

export const duration = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

/** Legendas: blocos de até 3 palavras, tempo proporcional ao nº de caracteres dentro da fala. */
export function captionChunks(text: string, startFrame: number, frames: number, emphasis: string[]): CaptionChunk[] {
  // termos que nunca se separam na legenda
  const KEEP = ['GTA 6', 'GTA VI', 'PS5 Pro', 'Xbox Series', 'Xbox One', 'Series S', 'ray tracing', 'Cloud Gaming', 'Remote Play', '19 de novembro'];
  let protectedText = text;
  for (const k of KEEP) protectedText = protectedText.replace(new RegExp(k, 'gi'), (m) => m.replace(/ /g, '\u00a0'));
  const words = protectedText.split(/[ \t\n]+/).filter(Boolean);
  const chunks: string[] = [];
  let cur: string[] = [];
  // nunca terminar um bloco em palavra funcional ("pode pedir DO" / "seu console")
  const FN = /^(a|o|as|os|e|é|de|do|da|dos|das|no|na|nos|nas|em|um|uma|que|pra|pro|com|se|tá|seu|sua|ao|à|por|mais|só|me|te|isso|esse|essa)$/i;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    cur.push(w);
    const len = cur.join(' ').length;
    const punct = /[.,:?!…]$/.test(w);
    const full = cur.length >= 3 || len >= 16;
    if (punct || (full && !(FN.test(w) && i < words.length - 1 && cur.length < 5))) {
      chunks.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur.join(' '));
  const total = chunks.reduce((s, c) => s + c.length + 2, 0);
  let acc = 0;
  return chunks.map((c) => {
    const from = startFrame + Math.round((acc / total) * frames);
    acc += c.length + 2;
    const to = startFrame + Math.round((acc / total) * frames);
    const clean = c.replace(/[,.:]$/, '').replace(/\u00a0/g, ' ');
    return { text: clean.toUpperCase(), from, to, emphasis: emphasis.some((e) => new RegExp(`(^|\\s)${e}(\\s|$|[?!])`, 'i').test(clean)) };
  });
}

/** Trilha de fundo 100% procedural (direito próprio): pulso grave 96 BPM + pad. */
export function proceduralBed(seconds: number, out: string) {
  if (existsSync(out) && duration(out) >= seconds) return;
  const beat = 60 / 96;
  const expr =
    `0.55*sin(2*PI*t*(45+90*exp(-mod(t,${beat})*28)))*exp(-mod(t,${beat})*7)` +
    `+0.05*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*t/${beat * 8}))` +
    `+0.04*sin(2*PI*82.4*t)*(0.6+0.4*sin(2*PI*t/${beat * 16}))`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}':s=48000:d=${seconds.toFixed(2)}`, '-af', 'lowpass=f=900,afade=t=in:d=0.4,afade=t=out:st=' + (seconds - 0.8).toFixed(2) + ':d=0.8', '-ac', '2', out]);
}

export interface RenderResult {
  id: string;
  file: string;
  durationSec: number;
  beatDurations: number[];
  props: ShortProps;
  reusedVoiceBeats: number;
}

export async function produceShort(script: Script, sb: Storyboard, opts: { voice?: Voice; renderDate?: Date } = {}): Promise<RenderResult> {
  if (sb.beats.length !== script.beats.length) throw new Error(`storyboard tem ${sb.beats.length} beats, roteiro tem ${script.beats.length}`);
  const voice = opts.voice ?? piperVoice;
  const lex = JSON.parse(readFileSync(join(paths.memory, 'lexico-pronuncia.json'), 'utf8'));
  const workDir = join(paths.output, script.id);
  const pubDir = join(paths.studio, 'public', script.id);
  mkdirSync(join(workDir, 'voice'), { recursive: true });
  mkdirSync(pubDir, { recursive: true });

  // 1) voz por beat (cache por hash do texto falado + voz)
  const wavs: string[] = [];
  let reused = 0;
  for (const b of script.beats) {
    const spoken = applyLexicon(b.narration, lex);
    const wav = join(workDir, 'voice', `${sha(voice.id + spoken)}.wav`);
    if (existsSync(wav)) reused++;
    else voice.synth(spoken, wav);
    wavs.push(wav);
  }
  const durs = wavs.map(duration);

  // 2) timeline
  let cursor = 0;
  const beats: TimelineBeat[] = script.beats.map((b, i) => {
    const speech = Math.ceil(durs[i] * FPS);
    const len = speech + (i === script.beats.length - 1 ? TAIL_FRAMES : GAP_FRAMES);
    const tb: TimelineBeat = {
      from: cursor,
      durationInFrames: len,
      layout: sb.beats[i].layout,
      seal: sb.beats[i].seal,
      sourceLabel: sb.beats[i].sourceLabel,
      captions: captionChunks(b.narration, cursor, speech, sb.emphasis),
    };
    b.t = [+(cursor / FPS).toFixed(2), +((cursor + len) / FPS).toFixed(2)];
    cursor += len;
    return tb;
  });
  const total = cursor;

  // 3) áudio: voz concatenada com os mesmos respiros da timeline
  const voiceOut = join(pubDir, 'voice.wav');
  const inputs = wavs.flatMap((w) => ['-i', w]);
  const delays = beats.map((tb, i) => `[${i}:a]aresample=48000,adelay=${Math.round((tb.from / FPS) * 1000)}|${Math.round((tb.from / FPS) * 1000)}[a${i}]`);
  const filter = `${delays.join(';')};${beats.map((_, i) => `[a${i}]`).join('')}amix=inputs=${beats.length}:normalize=0,apad=whole_dur=${(total / FPS).toFixed(3)}[out]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-ac', '2', voiceOut]);
  const bed = join(pubDir, 'bed.wav');
  proceduralBed(total / FPS + 0.5, bed);

  const props: ShortProps = {
    fps: FPS,
    durationInFrames: total,
    voiceSrc: `${script.id}/voice.wav`,
    bedSrc: `${script.id}/bed.wav`,
    beats,
    channel: 'SEIS ESTRELAS',
    renderDateISO: (opts.renderDate ?? new Date()).toISOString(),
  };
  writeFileSync(join(workDir, 'props.json'), JSON.stringify(props, null, 2));

  // 4) render Remotion
  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, selectComposition } = await import('@remotion/renderer');
  const serveUrl = await bundle({ entryPoint: join(paths.studio, 'src/index.ts'), publicDir: join(paths.studio, 'public') });
  const browserExecutable = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
  const composition = await selectComposition({ serveUrl, id: 'Short', inputProps: props, browserExecutable: existsSync(browserExecutable) ? browserExecutable : null });
  const raw = join(workDir, 'raw.mp4');
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 18,
    outputLocation: raw,
    inputProps: props,
    browserExecutable: existsSync(browserExecutable) ? browserExecutable : null,
    concurrency: 4,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0) process.stdout.write(`\r  render ${Math.round(progress * 100)}%   `);
    },
  });
  process.stdout.write('\n');

  // 5) loudness para mobile (-14 LUFS integrado, pico -1.5 dBTP), vídeo sem re-encode
  const finalFile = join(workDir, `${script.id}-v${script.version}.mp4`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', finalFile]);
  copyFileSync(join(workDir, 'props.json'), join(workDir, `props-v${script.version}.json`));
  return { id: script.id, file: finalFile, durationSec: total / FPS, beatDurations: durs, props, reusedVoiceBeats: reused };
}
