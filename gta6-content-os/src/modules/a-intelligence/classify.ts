import { createHash } from 'node:crypto';
import { SOURCE_TRUST, type FactStatus, type NewsItem } from '../../core/types.js';
import type { RawItem } from './sources/rockstar.js';

const STOP = new Set(
  'the a an of on in to and for with now new is are be your from at by grand theft auto vi gta 6 6 trailer official rockstar games video'.split(' '),
);

export function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((x) => b.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

const dayDiff = (a: string | null, b: string | null) =>
  a && b ? Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86_400_000 : 99;

/**
 * Deduplicação: mesmo acontecimento = títulos parecidos (Jaccard >= 0.5) publicados com até 2 dias
 * de diferença. A fonte de maior confiança vira a principal; as outras ficam em alsoReportedBy.
 * O feed do YouTube publica o mesmo vídeo como "watch" e "shorts": isso também é deduplicado.
 */
export function dedupe(items: RawItem[]): { primary: RawItem; others: RawItem[] }[] {
  const groups: { primary: RawItem; others: RawItem[]; tk: Set<string> }[] = [];
  const sorted = [...items].sort((x, y) => SOURCE_TRUST[y.source.kind] - SOURCE_TRUST[x.source.kind] || (y.evidence.length - x.evidence.length));
  for (const it of sorted) {
    const tk = tokens(it.title);
    const g = groups.find((g) => jaccard(g.tk, tk) >= 0.5 && dayDiff(g.primary.publishedAt, it.publishedAt) <= 2);
    if (g) g.others.push(it);
    else groups.push({ primary: it, others: [], tk });
  }
  return groups.map(({ primary, others }) => ({ primary, others }));
}

export function eventKey(title: string, date: string | null): string {
  const base = [...tokens(title)].sort().join('-') + '|' + (date?.slice(0, 7) ?? 'sem-data');
  return createHash('sha1').update(base).digest('hex').slice(0, 12);
}

const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';

/** Classificação de status factual. Fonte oficial => CONFIRMADO, salvo se o anúncio já venceu. */
export function classify(raw: RawItem, today: Date): FactStatus {
  const trust = SOURCE_TRUST[raw.source.kind];
  const coming = raw.title.match(new RegExp(`coming (${MONTHS}) (\\d{1,2})`, 'i'));
  if (coming && raw.publishedAt) {
    const year = raw.publishedAt.slice(0, 4);
    const d = new Date(`${coming[1]} ${coming[2]}, ${year}`);
    if (d.getTime() < today.getTime()) return 'DESATUALIZADO';
  }
  if (trust >= 0.95) return 'CONFIRMADO';
  if (trust >= 0.6) return 'INFORMACAO_DE_TERCEIROS';
  if (/\b(rumor|leak|vazamento|insider)\b/i.test(raw.title)) return 'RUMOR';
  if (/\b(theory|teoria)\b/i.test(raw.title)) return 'TEORIA';
  return 'OPINIAO';
}

/** Palavras com peso editorial para o público BR. Heurística transparente, ajustável na Creative Memory. */
const HOT: [RegExp, number][] = [
  [/launch|lançamento|release|november 19/i, 3],
  [/pre-?load|download|gb\b/i, 2.5],
  [/trailer|extended look|gameplay/i, 2.5],
  [/price|preço|edition|edição/i, 2],
  [/ps5|playstation|xbox|pc|cloud|fps|ray/i, 2],
  [/map|leonida|vice city/i, 1.5],
  [/soundtrack|score|album|radio|música/i, 1],
  [/online/i, 1.5],
];

export function score(raw: RawItem, today: Date) {
  const text = `${raw.title} ${raw.evidence}`;
  const heat = HOT.reduce((s, [re, w]) => s + (re.test(text) ? w : 0), 0);
  const ageDays = raw.publishedAt ? (today.getTime() - Date.parse(raw.publishedAt)) / 86_400_000 : 30;
  const recency = Math.max(0, 10 - ageDays / 3); // perde ~1 ponto a cada 3 dias
  const relevance = Math.min(10, +(heat * 0.9 + recency * 0.35).toFixed(1));
  // densidade factual: números concretos rendem Shorts melhores ("212 GB", "30 fps")
  const numbers = (raw.evidence.match(/\b\d+(?:[.,]\d+)?\s?(?:gb|fps|%|\$)/gi) ?? []).length;
  const editorialPotential = Math.min(10, +(relevance * 0.6 + Math.min(4, numbers * 1.2) + (raw.evidence.length > 800 ? 1 : 0)).toFixed(1));
  return {
    relevance,
    editorialPotential,
    shortPotential: editorialPotential >= 5 || numbers > 0,
    longPotential: raw.evidence.length > 1200 && editorialPotential >= 6,
    urgent: ageDays <= 2 && relevance >= 6,
  };
}

export function spoilerRisk(raw: RawItem, launchISO: string): NewsItem['spoilerRisk'] {
  const t = `${raw.title} ${raw.evidence}`;
  if (/\b(ending|final|dies|death of|plot twist|spoiler)\b/i.test(t)) return 'alto';
  if (raw.publishedAt && raw.publishedAt.slice(0, 10) >= launchISO) return 'medio';
  return raw.source.kind.startsWith('rockstar') ? 'nenhum' : 'baixo';
}
