#!/usr/bin/env tsx
/**
 * CLI do GTA 6 Content OS. Cada comando é uma etapa reprocessável isoladamente.
 *   radar · pautas · calendario · factcheck · render-short <id> · gates <id> · approve <kind> <id> · publish <id> · clip <video> · review
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Repo, type EntityKind } from './core/db.js';
import { daysToLaunch, launchPhase, paths } from './core/config.js';
import { loadScripts, newsMap } from './core/content.js';
import type { GateResult, Pauta, Script } from './core/types.js';
import { runRadar } from './modules/a-intelligence/radar.js';
import { opportunity, priorityQueue, type EditorialInputs } from './modules/c-strategy/opportunity.js';
import { buildCalendar, calendarMarkdown } from './modules/c-strategy/calendar.js';
import { gateAV, gateCreative, gateFacts, gatePublish } from './gates/gates.js';
import { produceShort, type Storyboard } from './modules/f-production/short.js';
import { shortMetadata } from './modules/g-seo/seo.js';
import { publishVideo } from './modules/h-publishing/youtube.js';
import { buildReview } from './review.js';

const [cmd, ...args] = process.argv.slice(2);
const repo = new Repo();
const today = new Date();
const printGate = (g: GateResult) => {
  console.log(`\n  GATE ${g.gate}: ${g.passed ? 'APROVADO ✅' : 'REPROVADO ❌'}`);
  for (const c of g.checks) if (!c.ok || process.env.VERBOSE) console.log(`    ${c.ok ? '✓' : '✗'} ${c.name} — ${c.detail}`);
  for (const h of g.humanChecklist) console.log(`    ☐ (humano) ${h}`);
};

const commands: Record<string, () => Promise<void>> = {
  async radar() {
    const r = await runRadar(repo, today);
    console.log(`Fase: ${launchPhase(today)} | faltam ${daysToLaunch(today)} dias`);
    console.log(`Lançamento oficial: ${r.launchCheck.found} (${r.launchCheck.ok ? 'confere' : 'DIVERGENTE'}) | plataformas: ${r.launchCheck.platforms.join(', ')}`);
    for (const s of r.sources) console.log(`  fonte ${s.ok ? 'OK ' : 'ERRO'} ${s.name}: ${s.count} ${s.error ?? ''}`);
    for (const i of r.items) console.log(`  [${i.editorialPotential}] ${i.status} ${i.publishedAt?.slice(0, 10)} ${i.title} (+${i.alsoReportedBy.length})`);
    for (const a of r.alerts) console.log('  ' + a);
  },

  async pautas() {
    const news = newsMap(repo);
    const raw = JSON.parse(readFileSync(join(paths.content, 'pautas', 'pautas-2026-11-17.json'), 'utf8')) as (Omit<Pauta, 'opportunity' | 'priority' | 'phase' | 'status'> & { editorial: EditorialInputs })[];
    const pautas: Pauta[] = raw.map((p) => {
      const items = p.newsIds.map((id) => news.get(id)).filter((n) => !!n);
      if (items.length !== p.newsIds.length) throw new Error(`pauta ${p.id}: newsId sem correspondência no radar — rode "npm run radar"`);
      const { editorial, ...rest } = p;
      return { ...rest, phase: launchPhase(today), opportunity: opportunity(items, editorial, today), priority: 0, status: 'aprovada' as const };
    });
    const queue = priorityQueue(pautas, news);
    for (const p of queue) repo.put('pauta', p);
    const md = [
      `# Fila de pautas — ${today.toISOString().slice(0, 10)}\n`,
      '| # | Prioridade | Índice | Pauta | Formato | Estilo | Notas |',
      '|---|---|---|---|---|---|---|',
      ...queue.map((p, i) => `| ${i + 1} | ${p.priority} | ${p.opportunity.total} | **${p.title}** — ${p.angle} | ${p.format} | ${p.style} | ${p.opportunity.notas.join('; ')} |`),
      '\n> Índice = priorização, não previsão. "evidenciaInteresse" e "concorrencia" ficam nulos até a YouTube Data API ser configurada.',
    ].join('\n');
    writeFileSync(join(paths.content, 'pautas', 'fila.md'), md);
    queue.forEach((p, i) => console.log(`${i + 1}. [${p.priority}] ${p.title} (${p.format})`));
  },

  async calendario() {
    const cal = buildCalendar();
    repo.put('calendar', { id: 'atual', entries: cal });
    writeFileSync(join(paths.content, 'calendario-30-dias.md'), calendarMarkdown(cal));
    writeFileSync(join(paths.content, 'calendario-30-dias.json'), JSON.stringify(cal, null, 2));
    console.log(`${cal.length} entradas (${cal.filter((c) => c.formato !== 'Reserva').length} conteúdos + ${cal.filter((c) => c.formato === 'Reserva').length} reservas urgentes)`);
  },

  async factcheck() {
    const news = newsMap(repo);
    let fail = 0;
    for (const s of loadScripts()) {
      repo.put('script', s);
      const g1 = gateFacts(s, news, today);
      const g2 = gateCreative(s);
      repo.put('gate', { id: `${s.id}:FATOS`, ...g1 });
      repo.put('gate', { id: `${s.id}:CRIATIVIDADE`, ...g2 });
      console.log(`\n■ ${s.id} — ${s.title} (${s.claims.length} afirmações)`);
      printGate(g1);
      printGate(g2);
      if (!g1.passed || !g2.passed) fail++;
    }
    if (fail) process.exitCode = 2;
  },

  async 'render-short'() {
    const id = args[0];
    const script = loadScripts().find((s) => s.id === id);
    if (!script) throw new Error(`roteiro ${id} não encontrado`);
    const news = newsMap(repo);
    const g1 = gateFacts(script, news, today);
    if (!g1.passed) {
      printGate(g1);
      throw new Error('Gate 1 (FATOS) reprovado — produção bloqueada');
    }
    const sb = JSON.parse(readFileSync(join(paths.content, 'storyboards', `${id}.json`), 'utf8')) as Storyboard;
    console.log(`Produzindo ${id} v${script.version}…`);
    const r = await produceShort(script, sb, { renderDate: today });
    const g2 = gateCreative(script, r.beatDurations);
    const g3 = gateAV(r.file, 'short');
    [g2, g3].forEach(printGate);
    repo.put('render', { id: `${id}-v${script.version}`, scriptId: id, file: r.file, durationSec: r.durationSec, voice: sb.voice, gates: { CRIATIVIDADE: g2.passed, AUDIOVISUAL: g3.passed }, at: today.toISOString() });
    repo.put('gate', { id: `${id}:AUDIOVISUAL`, ...g3 });
    mkdirSync(paths.entregas, { recursive: true });
    const deliver = join(paths.entregas, `${id}-v${script.version}.mp4`);
    copyFileSync(r.file, deliver);
    const meta = shortMetadata(script);
    writeFileSync(join(paths.content, 'seo', `${id}.md`), meta.markdown);
    console.log(`\nMP4: ${deliver} (${r.durationSec.toFixed(1)}s, voz reaproveitada em ${r.reusedVoiceBeats}/${script.beats.length} beats)`);
  },

  async gates() {
    const id = args[0];
    const script = loadScripts().find((s) => s.id === id)!;
    const news = newsMap(repo);
    const render = repo.get<{ file: string }>('render', `${id}-v${script.version}`);
    const g1 = gateFacts(script, news, today);
    const g2 = gateCreative(script);
    const g3 = render ? gateAV(render.file, script.format) : null;
    const g4 = gatePublish({
      assetsRights: ['PROPRIO'],
      spoilerRisk: 'nenhum',
      hasSpoilerWarning: false,
      humanApproved: repo.isApproved('render', `${id}-v${script.version}`),
      previousGatesPassed: g1.passed && g2.passed && !!g3?.passed,
      titleClaimsSupported: g1.passed,
    });
    [g1, g2, ...(g3 ? [g3] : []), g4].forEach(printGate);
  },

  async approve() {
    const [kind, id, decision = 'APROVADO', ...note] = args;
    const reviewer = process.env.GTA_OS_REVIEWER;
    if (!reviewer) throw new Error('defina GTA_OS_REVIEWER=<seu nome> — aprovação precisa de responsável identificado');
    repo.recordApproval(kind as EntityKind, id, decision, reviewer, note.join(' '));
    console.log(`${kind}/${id} v${repo.version(kind as EntityKind, id)} → ${decision} por ${reviewer}`);
  },

  async publish() {
    const id = args[0];
    const script = loadScripts().find((s) => s.id === id)!;
    const r = await publishVideo(repo, script, { dryRun: !args.includes('--real') });
    console.log(r);
  },

  /** Fluxo B — clipping. Exige manifesto de direitos; repassa tudo ao motor Python (clip-engine/clipper.py). */
  async clip() {
    const [video, rights, out = join(paths.output, 'clips-' + Date.now())] = args;
    if (!video || !rights) throw new Error('uso: npm run clip -- <video> <rights.json> [pasta-saida]');
    const { spawnSync } = await import('node:child_process');
    const py = (a: string[]) => {
      const r = spawnSync(paths.python, [join(paths.clipEngine, 'clipper.py'), ...a], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error(`clipper ${a[0]} falhou (${r.status})`);
    };
    py(['analyze', video, '--rights', rights, '--out', out, '--top', '3']);
    py(['render', out, '--top', '3', '--preset', process.env.CLIP_PRESET ?? 'gameplay_fit']);
    repo.put('clip_job', { id: out, video, rights, at: today.toISOString() });
  },

  /** Rotina diária: radar → pautas → calendário → fact-check → painel. Não renderiza nem publica. */
  async pipeline() {
    for (const c of ['radar', 'pautas', 'calendario', 'factcheck', 'review']) {
      console.log(`\n══ ${c} ══`);
      await commands[c]();
    }
  },

  async review() {
    const file = buildReview(repo);
    console.log(`Painel de revisão: ${file}`);
  },
};

const fn = commands[cmd];
if (!fn) {
  console.error(`comandos: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}
fn().catch((e) => {
  repo.log('cli', 'error', `${cmd} falhou`, String(e?.stack ?? e));
  console.error('ERRO:', e?.message ?? e);
  process.exit(1);
});

export type { Script };
