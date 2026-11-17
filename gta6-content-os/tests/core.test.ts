import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Repo } from '../src/core/db.js';
import { launchPhase } from '../src/core/config.js';
import { classify, dedupe } from '../src/modules/a-intelligence/classify.js';
import { parseArticle } from '../src/modules/a-intelligence/sources/rockstar.js';
import { opportunity } from '../src/modules/c-strategy/opportunity.js';
import { gateCreative, gateFacts, gatePublish } from '../src/gates/gates.js';
import { applyLexicon, captionChunks } from '../src/modules/f-production/short.js';
import { publishVideo } from '../src/modules/h-publishing/youtube.js';
import type { NewsItem, Script } from '../src/core/types.js';
import type { RawItem } from '../src/modules/a-intelligence/sources/rockstar.js';

const NOW = new Date('2026-11-17T12:00:00Z');

const raw = (title: string, kind: RawItem['source']['kind'], date: string, evidence = ''): RawItem => ({
  title, summary: '', evidence, url: `https://x/${encodeURIComponent(title)}`, publishedAt: date,
  source: { kind, name: kind, url: 'https://x' },
});

const news = (id: string, evidence: string, over: Partial<NewsItem> = {}): NewsItem => ({
  id, eventKey: id, title: id, summary: '', evidence, source: { kind: 'rockstar_newswire', name: 'n', url: 'https://x' },
  alsoReportedBy: [], publishedAt: '2026-11-10', eventDate: '2026-11-10', lastVerifiedAt: NOW.toISOString(), status: 'CONFIRMADO',
  confidence: 1, relevance: 8, editorialPotential: 8, shortPotential: true, longPotential: false, spoilerRisk: 'nenhum', urgent: false,
  approval: 'PENDENTE', tags: [], ...over,
});

const script = (claims: Script['claims'], onScreen = '212 GB', narration = '212 gigas. Olha isso.'): Script => ({
  id: 't', pautaId: 'p', format: 'short', style: 'lista', title: 't', audience: 'a', goal: 'g', promise: 'p', hook: 'h', fullText: '',
  beats: [{ t: [0, 0], narration, onScreen, visual: '', edit: '', animation: '', audio: '' }], cta: 'comenta', claims,
  sources: [{ kind: 'rockstar_newswire', name: 'n', url: 'https://x' }], version: 1, approval: 'PENDENTE',
});

test('fase de lançamento muda automaticamente', () => {
  assert.equal(launchPhase(new Date('2026-11-17')), 'PRE_LANCAMENTO');
  assert.equal(launchPhase(new Date('2026-11-19')), 'LANCAMENTO');
  assert.equal(launchPhase(new Date('2026-12-20')), 'POS_LANCAMENTO');
});

test('dedupe junta o mesmo acontecimento de fontes diferentes e mantém a mais confiável', () => {
  const g = dedupe([
    raw('Grand Theft Auto VI: Pre-Load Now', 'rockstar_youtube', '2026-11-10'),
    raw('Pre-Load Grand Theft Auto VI Now', 'rockstar_newswire', '2026-11-10', 'texto longo'),
    raw('Grand Theft Auto VI: The Festival', 'rockstar_newswire', '2026-11-09'),
  ]);
  assert.equal(g.length, 2);
  assert.equal(g.find((x) => x.others.length)!.primary.source.kind, 'rockstar_newswire');
});

test('anúncio "Coming <data>" vencido vira DESATUALIZADO; imprensa nunca vira CONFIRMADO', () => {
  assert.equal(classify(raw('An Extended Look Coming August 27', 'rockstar_youtube', '2026-08-06'), NOW), 'DESATUALIZADO');
  assert.equal(classify(raw('Pre-Load Now', 'rockstar_newswire', '2026-11-10'), NOW), 'CONFIRMADO');
  assert.equal(classify(raw('GTA 6 PC date', 'press', '2026-11-10'), NOW), 'INFORMACAO_DE_TERCEIROS');
  assert.equal(classify(raw('GTA 6 leak shows map', 'community', '2026-11-10'), NOW), 'RUMOR');
});

test('parser de artigo do Newswire extrai título, data e corpo', () => {
  const a = parseArticle('NewswireGrand Theft Auto VIAnnouncements\nPre-Load Grand Theft Auto VI Now\nNovember 10, 2026\n\nPre-loading is now available for everyone.\n(Opens in a new window)\nRelated Stories');
  assert.deepEqual(a, { title: 'Pre-Load Grand Theft Auto VI Now', date: '2026-11-10', body: 'Pre-loading is now available for everyone.' });
});

test('GATE 1 reprova citação inventada e aprova citação literal (ignorando aspas curvas/espaços)', () => {
  const m = new Map([['n1', news('n1', 'The pre-load file will require up to 212 GB depending on your device. It’s here.')]]);
  assert.equal(gateFacts(script([{ text: 'x', newsIds: ['n1'], quote: 'up to 212  GB depending' }]), m, NOW).passed, true);
  assert.equal(gateFacts(script([{ text: 'x', newsIds: ['n1'], quote: "it's here" }], 'SEM NÚMERO'), m, NOW).passed, true);
  assert.equal(gateFacts(script([{ text: 'x', newsIds: ['n1'], quote: 'requires 250 GB' }]), m, NOW).passed, false);
});

test('GATE 1 reprova número na tela sem fonte, fonte não confirmada e verificação velha', () => {
  const m = new Map([['n1', news('n1', 'up to 212 GB')]]);
  const ok = [{ text: 'x', newsIds: ['n1'], quote: 'up to 212 GB' }];
  assert.equal(gateFacts(script(ok, '250 GB'), m, NOW).passed, false);
  assert.equal(gateFacts(script(ok, '19/11'), m, NOW).passed, false); // data sem citação
  const rumor = new Map([['n1', news('n1', 'up to 212 GB', { status: 'RUMOR' })]]);
  assert.equal(gateFacts(script(ok), rumor, NOW).passed, false);
  const old = new Map([['n1', news('n1', 'up to 212 GB', { lastVerifiedAt: '2026-11-01T00:00:00Z' })]]);
  assert.equal(gateFacts(script(ok), old, NOW).passed, false);
});

test('GATE 2 barra linguagem robótica', () => {
  const s = script([], 'x', 'Prepare-se para mergulhar em uma experiência revolucionária!');
  const g = gateCreative(s);
  assert.equal(g.passed, false);
  assert.ok(g.checks.filter((c) => !c.ok).length >= 3);
});

test('índice de oportunidade não inventa dados ausentes', () => {
  const o = opportunity([news('n', '')], { originalidade: 5, viabilidade: 5, potencialConversa: 5, riscoDireitos: 0 }, NOW);
  assert.equal(o.evidenciaInteresse, null);
  assert.equal(o.concorrencia, null);
  assert.ok(o.notas.some((n) => n.includes('evidenciaInteresse')));
});

test('aprovação vale só para a versão aprovada', () => {
  const r = new Repo(':memory:');
  r.put('render', { id: 'v', file: 'a' });
  r.recordApproval('render', 'v', 'APROVADO', 'teste');
  assert.equal(r.isApproved('render', 'v'), true);
  r.put('render', { id: 'v', file: 'b' }, 'legenda corrigida');
  assert.equal(r.isApproved('render', 'v'), false);
  assert.equal(r.history('render', 'v').length, 1);
});

test('GATE 4 exige aprovação humana e direitos', () => {
  const base = { assetsRights: ['PROPRIO'] as const, spoilerRisk: 'nenhum' as const, hasSpoilerWarning: false, previousGatesPassed: true, titleClaimsSupported: true };
  assert.equal(gatePublish({ ...base, assetsRights: [...base.assetsRights], humanApproved: false }).passed, false);
  assert.equal(gatePublish({ ...base, assetsRights: ['SEM_AUTORIZACAO'], humanApproved: true }).passed, false);
  assert.equal(gatePublish({ ...base, assetsRights: ['PROPRIO'], humanApproved: true }).passed, true);
});

test('publicação é bloqueada sem aprovação, antes de qualquer rede', async () => {
  const r = new Repo(':memory:');
  const s = script([]);
  r.put('render', { id: 't-v1', file: new URL(import.meta.url).pathname });
  const out = await publishVideo(r, s, { dryRun: false });
  assert.equal(out.status, 'BLOQUEADO');
  assert.ok(out.reasons.some((x) => x.includes('aprovação humana')));
});

test('legendas não terminam em palavra funcional nem separam "GTA 6"', () => {
  const t = captionChunks('É isso que o GTA 6 pode pedir do seu console.', 0, 90, []).map((c) => c.text);
  assert.ok(t.every((c) => !/ (DO|O|QUE|E)$/.test(c)), t.join('|'));
  assert.ok(t.some((c) => c.includes('GTA 6')));
});

test('léxico de pronúncia só afeta o TTS e respeita termos maiores primeiro', () => {
  assert.equal(applyLexicon('no PS5 Pro e no PS5', { PS5: 'PS cinco', 'PS5 Pro': 'PS cinco Pro' }), 'no PS cinco Pro e no PS cinco');
});

test('GATE 4: material oficial exige autorização registrada, crédito e uso não comercial', () => {
  const base = { spoilerRisk: 'nenhum' as const, hasSpoilerWarning: false, previousGatesPassed: true, titleClaimsSupported: true, humanApproved: true };
  const ok = { authorized: true, creditShown: true, nonCommercialOnly: true };
  // sem registro de uso anexado: reprova mesmo sendo um status "conhecido"
  assert.equal(gatePublish({ ...base, assetsRights: ['MATERIAL_OFICIAL_DIVULGACAO'] }).passed, false);
  assert.equal(gatePublish({ ...base, assetsRights: ['MATERIAL_OFICIAL_DIVULGACAO'], official: [ok] }).passed, true);
  assert.equal(gatePublish({ ...base, assetsRights: ['MATERIAL_OFICIAL_DIVULGACAO'], official: [{ ...ok, authorized: false }] }).passed, false);
  assert.equal(gatePublish({ ...base, assetsRights: ['MATERIAL_OFICIAL_DIVULGACAO'], official: [{ ...ok, creditShown: false }] }).passed, false);
  assert.equal(gatePublish({ ...base, assetsRights: ['MATERIAL_OFICIAL_DIVULGACAO'], official: [ok], channelMonetized: true }).passed, false);
  assert.equal(gatePublish({ ...base, assetsRights: ['MATERIAL_OFICIAL_DIVULGACAO'], official: [{ ...ok, commercialLicense: 'contrato-123' }], channelMonetized: true }).passed, true);
});
