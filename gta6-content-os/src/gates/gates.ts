/**
 * QUALITY GATES. Um gate reprovado bloqueia o avanço; nada é "aprovado" automaticamente:
 * os gates automáticos são condição NECESSÁRIA, a aprovação humana é condição SUFICIENTE.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { GateResult, NewsItem, RightsStatus, Script } from '../core/types.js';

type Check = GateResult['checks'][number];
const now = () => new Date().toISOString();

export const norm = (s: string) =>
  s
    .normalize('NFKC')
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/* ------------------------------ GATE 1 — FATOS ------------------------------ */

export function gateFacts(script: Script, news: Map<string, NewsItem>, today = new Date(), maxAgeHours = 72): GateResult {
  const checks: Check[] = [];
  for (const [i, c] of script.claims.entries()) {
    const items = c.newsIds.map((id) => news.get(id));
    const missing = c.newsIds.filter((_, k) => !items[k]);
    if (missing.length) {
      checks.push({ name: `claim#${i + 1} fonte existe`, ok: false, detail: `newsId ausente no radar: ${missing.join(', ')}` });
      continue;
    }
    const found = items.some((n) => norm(n!.evidence).includes(norm(c.quote)));
    checks.push({ name: `claim#${i + 1} citação literal`, ok: found, detail: found ? c.text : `citação NÃO encontrada na evidência: "${c.quote}"` });
    const weak = items.filter((n) => n!.status !== 'CONFIRMADO');
    checks.push({
      name: `claim#${i + 1} status`,
      ok: weak.length === 0,
      detail: weak.length ? `fonte com status ${weak.map((n) => n!.status).join('/')} — exige selo de RUMOR/TERCEIROS na tela` : 'CONFIRMADO',
    });
    const stale = items.filter((n) => (today.getTime() - Date.parse(n!.lastVerifiedAt)) / 3_600_000 > maxAgeHours);
    checks.push({
      name: `claim#${i + 1} verificação recente`,
      ok: stale.length === 0,
      detail: stale.length ? `re-verificar: última checagem ${stale[0]!.lastVerifiedAt}` : `verificado há < ${maxAgeHours}h`,
    });
  }
  // todo número que aparece na TELA precisa estar sustentado por alguma citação
  const quotes = norm(script.claims.map((c) => `${c.quote} ${c.text}`).join(' '));
  const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (const b of script.beats) {
    // datas DD/MM na tela precisam bater com "Month D" em alguma citação
    for (const [whole, d, m] of b.onScreen.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)) {
      const month = MONTHS_EN[Number(m) - 1];
      const ok = !!month && new RegExp(`${month} ${Number(d)}(\\D|$)`).test(quotes);
      checks.push({ name: `data na tela "${whole}"`, ok, detail: ok ? `sustentada (${month} ${Number(d)})` : `data "${whole}" sem citação correspondente` });
    }
    for (const n of b.onScreen.replace(/\b\d{1,2}\/\d{1,2}\b/g, ' ').match(/\d+/g) ?? []) {
      const ok = new RegExp(`(^|\\D)${n}(\\D|$)`).test(quotes);
      checks.push({ name: `número na tela "${n}"`, ok, detail: ok ? 'sustentado por citação' : `"${n}" em "${b.onScreen}" sem citação correspondente` });
    }
  }
  if (!script.sources.length) checks.push({ name: 'fontes listadas', ok: false, detail: 'roteiro sem fontes' });
  return {
    gate: 'FATOS',
    passed: checks.every((c) => c.ok),
    checks,
    humanChecklist: [
      'As traduções preservam o sentido da fonte (sem exagerar "mira 30 fps" para "roda a 30 fps")?',
      'Tempo verbal correto para a data de publicação (sai/saiu)?',
      'Opiniões estão marcadas como OPINIÃO?',
    ],
    at: now(),
  };
}

/* ------------------------------ GATE 2 — CRIATIVIDADE ------------------------------ */

export const ROBOTIC = [
  /prepare-se/i,
  /mergulh(ar|e|amos)/i,
  /revolucion[aá]ri/i,
  /redefinir/i,
  /n[aã]o perca/i,
  /neste v[ií]deo (vamos|iremos)/i,
  /sem mais delongas/i,
  /incr[ií]vel jornada/i,
  /voc[eê] n[aã]o vai acreditar/i,
  /chocante/i,
  /\bconfira\b/i,
  /experi[eê]ncia (única|imersiva)/i,
  /universo dos games/i,
];

export function gateCreative(script: Script, durations?: number[]): GateResult {
  const checks: Check[] = [];
  const all = script.beats.map((b) => b.narration).join(' ');
  for (const re of ROBOTIC) {
    const m = all.match(re);
    checks.push({ name: `sem clichê ${re.source}`, ok: !m, detail: m ? `encontrado: "${m[0]}"` : 'ok' });
  }
  // gancho = primeira frase falada; em Short o primeiro beat inteiro também precisa ser curto
  const first = script.beats[0]?.narration ?? '';
  const firstSentence = first.split(/(?<=[.!?…])\s/)[0];
  const hookWords = firstSentence.split(/\s+/).length;
  checks.push({ name: 'gancho curto', ok: hookWords <= 18, detail: `${hookWords} palavras na 1ª frase (máx 18)` });
  if (script.format === 'short') {
    const w = first.split(/\s+/).length;
    checks.push({ name: 'primeiro beat do Short', ok: w <= 25, detail: `${w} palavras (máx 25 ≈ 3s)` });
  }
  checks.push({ name: 'CTA definido', ok: script.cta.trim().length > 0, detail: script.cta });
  const sentences = all.split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean);
  const long = sentences.filter((s) => s.split(/\s+/).length > (script.format === 'short' ? 22 : 35));
  checks.push({ name: 'frases curtas', ok: long.length === 0, detail: long.length ? `longas: ${long.map((s) => s.slice(0, 50)).join(' | ')}` : 'ok' });
  if (durations && script.format === 'short') {
    const total = durations.reduce((a, b) => a + b, 0);
    checks.push({ name: 'duração de Short', ok: total >= 15 && total <= 59, detail: `${total.toFixed(1)}s` });
    const wps = all.split(/\s+/).length / total;
    checks.push({ name: 'ritmo de fala', ok: wps >= 2.0 && wps <= 3.8, detail: `${wps.toFixed(2)} palavras/s` });
  }
  return {
    gate: 'CRIATIVIDADE',
    passed: checks.every((c) => c.ok),
    checks,
    humanChecklist: [
      'O gancho é interessante para quem NÃO é fã hardcore?',
      'Tem algo aqui que outros canais não estão fazendo (ângulo/selo/utilidade)?',
      'Lido em voz alta, soa como gente?',
    ],
    at: now(),
  };
}

/* ------------------------------ GATE 3 — AUDIOVISUAL ------------------------------ */

export interface MediaProbe {
  width: number;
  height: number;
  duration: number;
  fps: number;
  hasAudio: boolean;
  integratedLufs: number | null;
  truePeak: number | null;
}

export function probe(file: string): MediaProbe {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]).toString());
  const v = j.streams.find((s: any) => s.codec_type === 'video');
  const a = j.streams.find((s: any) => s.codec_type === 'audio');
  const [n, d] = String(v?.r_frame_rate ?? '0/1').split('/').map(Number);
  let integratedLufs: number | null = null;
  let truePeak: number | null = null;
  if (a) {
    // ebur128 escreve o resumo no stderr
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
    const summary = r.stderr.split('Summary:').pop() ?? '';
    const i = summary.match(/I:\s+(-?[\d.]+) LUFS/);
    const tp = summary.match(/Peak:\s+(-?[\d.]+) dBFS/);
    integratedLufs = i ? Number(i[1]) : null;
    truePeak = tp ? Number(tp[1]) : null;
  }
  return { width: v?.width ?? 0, height: v?.height ?? 0, duration: Number(j.format.duration), fps: d ? n / d : 0, hasAudio: !!a, integratedLufs, truePeak };
}

export function gateAV(file: string, kind: 'short' | 'longo'): GateResult {
  const checks: Check[] = [];
  if (!existsSync(file)) {
    return { gate: 'AUDIOVISUAL', passed: false, checks: [{ name: 'arquivo existe', ok: false, detail: file }], humanChecklist: [], at: now() };
  }
  const p = probe(file);
  if (kind === 'short') {
    checks.push({ name: 'formato 9:16', ok: p.width * 16 === p.height * 9, detail: `${p.width}x${p.height}` });
    checks.push({ name: 'resolução ≥ 1080x1920', ok: p.width >= 1080, detail: `${p.width}x${p.height}` });
    checks.push({ name: 'duração ≤ 60s', ok: p.duration <= 60, detail: `${p.duration.toFixed(2)}s` });
  } else {
    checks.push({ name: 'formato 16:9', ok: p.width * 9 === p.height * 16, detail: `${p.width}x${p.height}` });
  }
  checks.push({ name: 'fps ≥ 24', ok: p.fps >= 24, detail: `${p.fps.toFixed(2)} fps` });
  checks.push({ name: 'tem áudio', ok: p.hasAudio, detail: p.hasAudio ? 'sim' : 'sem trilha de áudio' });
  if (p.integratedLufs !== null)
    checks.push({ name: 'loudness -16..-12 LUFS (mobile)', ok: p.integratedLufs >= -16.5 && p.integratedLufs <= -11.5, detail: `${p.integratedLufs} LUFS` });
  if (p.truePeak !== null) checks.push({ name: 'true peak ≤ -1 dBFS', ok: p.truePeak <= -1, detail: `${p.truePeak} dBFS` });
  return {
    gate: 'AUDIOVISUAL',
    passed: checks.every((c) => c.ok),
    checks,
    humanChecklist: [
      'Assistir com som e sem som: legenda acompanha a fala?',
      'Nenhum texto importante sob a UI do YouTube Shorts (rodapé ~20% e lateral direita)?',
      'Cortes fazem sentido; nenhum elemento importante (HUD/minimapa/ação) cortado?',
    ],
    at: now(),
  };
}

/* ------------------------------ GATE 4 — PUBLICAÇÃO ------------------------------ */

export interface PublishContext {
  assetsRights: RightsStatus[];
  spoilerRisk: NewsItem['spoilerRisk'];
  hasSpoilerWarning: boolean;
  humanApproved: boolean;
  previousGatesPassed: boolean;
  titleClaimsSupported: boolean;
}

const OK_RIGHTS: RightsStatus[] = ['PROPRIO', 'LICENCA_ABERTA', 'AUTORIZADO_POR_ESCRITO'];

export function gatePublish(ctx: PublishContext): GateResult {
  const bad = ctx.assetsRights.filter((r) => !OK_RIGHTS.includes(r));
  const checks: Check[] = [
    { name: 'gates 1-3 aprovados', ok: ctx.previousGatesPassed, detail: ctx.previousGatesPassed ? 'ok' : 'há gate anterior reprovado' },
    { name: 'direitos de todos os ativos', ok: bad.length === 0, detail: bad.length ? `ativos com direito ${[...new Set(bad)].join(', ')}` : 'ok' },
    {
      name: 'spoiler sinalizado',
      ok: ctx.spoilerRisk === 'nenhum' || ctx.spoilerRisk === 'baixo' || ctx.hasSpoilerWarning,
      detail: `risco ${ctx.spoilerRisk}${ctx.hasSpoilerWarning ? ' com aviso' : ''}`,
    },
    { name: 'título/capa sustentados por fatos', ok: ctx.titleClaimsSupported, detail: ctx.titleClaimsSupported ? 'ok' : 'título promete algo sem fonte' },
    { name: 'aprovação humana (versão atual)', ok: ctx.humanApproved, detail: ctx.humanApproved ? 'aprovado' : 'AGUARDANDO APROVAÇÃO' },
  ];
  return {
    gate: 'PUBLICACAO',
    passed: checks.every((c) => c.ok),
    checks,
    humanChecklist: ['A thumbnail mostra apenas o que existe no vídeo?', 'Descrição tem fontes e aviso de canal de fã?'],
    at: now(),
  };
}
