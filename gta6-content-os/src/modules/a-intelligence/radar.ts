/**
 * MÓDULO A — GTA INTELLIGENCE
 * Entrada: nenhuma (consulta fontes configuradas). Saída: NewsItem[] persistidos + snapshot JSON/MD.
 * Regras: nunca inventa; toda notícia guarda evidência literal; falha de uma fonte não derruba o radar.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Repo } from '../../core/db.js';
import { LAUNCH, paths } from '../../core/config.js';
import type { NewsItem } from '../../core/types.js';
import { classify, dedupe, eventKey, score, spoilerRisk } from './classify.js';
import { rockstarNewswire, rockstarOfficialPage, rockstarYouTube, type RawItem } from './sources/rockstar.js';

export interface RadarReport {
  ranAt: string;
  launchCheck: { expected: string; found: string | null; ok: boolean; platforms: string[] };
  sources: { name: string; ok: boolean; count: number; error?: string }[];
  items: NewsItem[];
  alerts: string[];
}

export async function runRadar(repo: Repo, today = new Date()): Promise<RadarReport> {
  const alerts: string[] = [];
  const sources: RadarReport['sources'] = [];
  const raws: RawItem[] = [];

  let launchFound: string | null = null;
  let platforms: string[] = [];
  let articleSeeds: string[] = [];
  try {
    const page = await rockstarOfficialPage();
    launchFound = page.launchDateText;
    platforms = page.platforms;
    articleSeeds = page.articleUrls;
    raws.push({
      title: 'Página oficial de Grand Theft Auto VI (estado atual)',
      summary: `Data na página: ${page.launchDateText ?? '—'}. Plataformas citadas: ${page.platforms.join(', ')}.`,
      evidence: [`Coming ${page.launchDateText}`, `Plataformas: ${page.platforms.join(', ')}`, ...page.texts].join('\n'),
      url: 'https://www.rockstargames.com/VI',
      publishedAt: today.toISOString(),
      source: { kind: 'rockstar_site', name: 'rockstargames.com/VI', url: 'https://www.rockstargames.com/VI' },
    });
    sources.push({ name: 'rockstargames.com/VI', ok: true, count: articleSeeds.length });
  } catch (e) {
    sources.push({ name: 'rockstargames.com/VI', ok: false, count: 0, error: String(e) });
  }
  const expected = new Date(LAUNCH.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const launchOk = launchFound === expected;
  if (!launchOk) alerts.push(`ALERTA: data na página oficial (${launchFound ?? 'não encontrada'}) difere da configurada (${expected}). Revisar TODO conteúdo com data.`);

  for (const [name, fn] of [
    ['YouTube RockstarGames (RSS)', () => rockstarYouTube()],
    ['Rockstar Newswire', () => rockstarNewswire(articleSeeds)],
  ] as const) {
    try {
      const r = await fn();
      raws.push(...r);
      sources.push({ name, ok: true, count: r.length });
    } catch (e) {
      sources.push({ name, ok: false, count: 0, error: String(e).slice(0, 300) });
      repo.log('radar', 'error', `fonte falhou: ${name}`, String(e));
    }
  }

  const relevant = raws.filter((r) => /Grand Theft Auto VI|GTA ?VI|GTAVI|Leonida|Vice City/i.test(r.title + ' ' + r.evidence));
  const items: NewsItem[] = [];
  for (const { primary, others } of dedupe(relevant)) {
    const s = score(primary, today);
    const key = primary.source.kind === 'rockstar_site' ? 'pagina-oficial-vi' : eventKey(primary.title, primary.publishedAt);
    const existing = repo.get<NewsItem>('news', key);
    const item: NewsItem = {
      id: key,
      eventKey: key,
      title: primary.title,
      summary: primary.summary,
      evidence: primary.evidence,
      source: primary.source,
      alsoReportedBy: others.map((o) => o.source),
      publishedAt: primary.publishedAt,
      eventDate: primary.publishedAt?.slice(0, 10) ?? null,
      lastVerifiedAt: today.toISOString(),
      status: classify(primary, today),
      confidence: primary.source.kind.startsWith('rockstar') ? 1 : 0.5,
      ...s,
      spoilerRisk: spoilerRisk(primary, LAUNCH.date),
      approval: existing?.approval ?? 'PENDENTE',
      tags: [primary.source.kind, ...(primary.extra?.isShort ? ['short'] : [])],
    };
    repo.put('news', item, existing ? 'reverificacao' : 'novo');
    items.push(item);
  }
  items.sort((a, b) => b.editorialPotential - a.editorialPotential);
  for (const u of items.filter((i) => i.urgent)) alerts.push(`URGENTE (verificado): ${u.title}`);

  const report: RadarReport = {
    ranAt: today.toISOString(),
    launchCheck: { expected, found: launchFound, ok: launchOk, platforms },
    sources,
    items,
    alerts,
  };
  const day = today.toISOString().slice(0, 10);
  writeFileSync(join(paths.content, `radar-${day}.json`), JSON.stringify(report, null, 2));
  writeFileSync(join(paths.content, `radar-${day}.md`), radarMarkdown(report));
  repo.log('radar', 'info', 'radar executado', { items: items.length, alerts: alerts.length });
  return report;
}

export function radarMarkdown(r: RadarReport): string {
  const L: string[] = [];
  L.push(`# Radar GTA VI — ${r.ranAt.slice(0, 16).replace('T', ' ')} UTC\n`);
  L.push(`**Data de lançamento na página oficial:** ${r.launchCheck.found ?? '—'} ${r.launchCheck.ok ? '✅ confere' : '⚠️ DIVERGENTE'}  `);
  L.push(`**Plataformas citadas na página oficial:** ${r.launchCheck.platforms.join(', ') || '—'}\n`);
  if (r.alerts.length) L.push('## Alertas\n' + r.alerts.map((a) => `- ${a}`).join('\n') + '\n');
  L.push('## Fontes\n| Fonte | OK | Itens |\n|---|---|---|');
  for (const s of r.sources) L.push(`| ${s.name} | ${s.ok ? '✅' : '❌ ' + (s.error ?? '')} | ${s.count} |`);
  L.push('\n## Itens (deduplicados, ordenados por potencial editorial)\n');
  L.push('| Pot. | Rel. | Status | Data | Título | Short | Longo | Spoiler | Fontes |\n|---|---|---|---|---|---|---|---|---|');
  for (const i of r.items)
    L.push(
      `| ${i.editorialPotential} | ${i.relevance} | ${i.status} | ${i.publishedAt?.slice(0, 10) ?? '—'} | [${i.title}](${i.source.url}) | ${i.shortPotential ? 'sim' : '—'} | ${i.longPotential ? 'sim' : '—'} | ${i.spoilerRisk} | ${1 + i.alsoReportedBy.length} |`,
    );
  L.push('\n> Notas são ferramentas de priorização, não previsão de visualizações.');
  return L.join('\n');
}
