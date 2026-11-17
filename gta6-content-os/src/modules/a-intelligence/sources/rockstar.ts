/**
 * Coletores das fontes OFICIAIS da Rockstar. Apenas páginas públicas e o feed RSS público
 * do YouTube — sem APIs não documentadas, sem contornar nada.
 *
 *  - Página oficial do jogo  https://www.rockstargames.com/VI   (HTML servido no servidor)
 *  - Newswire (artigos)      renderizados com Chromium headless, como um navegador comum
 *  - YouTube oficial         https://www.youtube.com/feeds/videos.xml?user=RockstarGames
 */
import type { Source } from '../../../core/types.js';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 GTA6ContentOS-radar/0.1';

export interface RawItem {
  title: string;
  summary: string;
  evidence: string;
  url: string;
  publishedAt: string | null;
  source: Source;
  extra?: Record<string, unknown>;
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** Feed RSS público do canal oficial. */
export async function rockstarYouTube(): Promise<RawItem[]> {
  const xml = await get('https://www.youtube.com/feeds/videos.xml?user=RockstarGames');
  const out: RawItem[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const title = decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const url = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? '';
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;
    const desc = decode(e.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? '');
    const views = e.match(/<media:statistics views="(\d+)"/)?.[1];
    out.push({
      title,
      summary: desc.split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 400),
      evidence: desc.slice(0, 600),
      url,
      publishedAt: published,
      source: { kind: 'rockstar_youtube', name: 'Rockstar Games (YouTube oficial)', url },
      extra: { views: views ? Number(views) : undefined, isShort: url.includes('/shorts/') },
    });
  }
  return out;
}

export interface OfficialPageFacts {
  launchDateText: string | null;
  platforms: string[];
  articleUrls: string[];
  /** blocos de texto da página (sinopse, edições, avisos), usados como evidência literal */
  texts: string[];
}

/** Página oficial do jogo: data de lançamento, plataformas e links do Newswire. */
export async function rockstarOfficialPage(): Promise<OfficialPageFacts> {
  const html = await get('https://www.rockstargames.com/VI');
  const flat = html.replace(/\\u002F/g, '/').replace(/\\"/g, '"');
  const launch = flat.match(/Coming(?:\s|<[^>]+>|",\["\$","br","br0",\{\}\],")*\s*((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})/);
  // Plataformas: só nomes por extenso cercados por texto (evita falsos positivos de base64 como "PC5BD...")
  const platforms = ['PlayStation 5', 'Xbox Series X|S', 'XBOX Series X|S', 'PC'].filter((p) =>
    new RegExp(`(^|[^A-Za-z0-9+/])${p.replace(/[|]/g, '\\|')}(?![A-Za-z0-9+/=])`).test(flat),
  );
  const articleUrls = [...new Set(flat.match(/https:\/\/www\.rockstargames\.com\/newswire\/article\/[a-z0-9]+/g) ?? [])];
  const texts = [
    ...new Set(
      [...flat.matchAll(/"children":"([^"$\\][^"\\]{50,700})"/g)]
        .map((m) => m[1])
        .filter((t) => !/scrollRestoration|Do Not Sell|accessibility|animations/i.test(t)),
    ),
  ];
  return {
    launchDateText: launch?.[1] ?? null,
    platforms: [...new Set(platforms.map((p) => p.replace('XBOX', 'Xbox')))],
    articleUrls,
    texts,
  };
}

/** Renderiza artigos do Newswire (conteúdo é montado via JS) com o Chromium já instalado. */
export async function rockstarNewswire(seedUrls: string[], maxArticles = 12): Promise<RawItem[]> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: UA });
  const queue = [...seedUrls];
  const seen = new Set<string>();
  const out: RawItem[] = [];
  try {
    while (queue.length && out.length < maxArticles) {
      const url = queue.shift()!;
      const key = url.match(/article\/([a-z0-9]+)/)?.[1];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      const data = await page.evaluate(() => {
        const root = (document.querySelector('article') ?? document.querySelector('main') ?? document.body) as HTMLElement;
        const links = [...document.querySelectorAll('a[href*="/newswire/article/"]')].map((a) => (a as HTMLAnchorElement).href);
        return { text: root.innerText, links, finalUrl: location.href, title: document.title };
      });
      for (const l of data.links) if (/grand-theft-auto-vi|gta-vi|gtavi/i.test(l) || l.includes('/article/')) queue.push(l.split('?')[0]);
      const parsed = parseArticle(data.text);
      if (!parsed || !/Grand Theft Auto VI|GTA ?VI/i.test(parsed.title + parsed.body)) continue;
      out.push({
        title: parsed.title,
        summary: parsed.body.split('\n').filter((p) => p.length > 60)[0]?.slice(0, 500) ?? '',
        evidence: parsed.body.slice(0, 4000),
        url: data.finalUrl,
        publishedAt: parsed.date,
        source: { kind: 'rockstar_newswire', name: 'Rockstar Newswire', url: data.finalUrl },
      });
    }
  } finally {
    await browser.close();
  }
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function parseArticle(text: string): { title: string; date: string | null; body: string } | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const di = lines.findIndex((l) => new RegExp(`^(${MONTHS.join('|')}) \\d{1,2}, \\d{4}$`).test(l));
  if (di < 1) return null;
  // título = primeira linha "de título" antes da data (pula breadcrumb "Newswire…" e subtítulos)
  const before = lines.slice(0, di).filter((l) => !/^Newswire/.test(l));
  const title = before[0] ?? lines[di - 1];
  const endIdx = lines.findIndex((l, i) => i > di && /^(\(Opens in a new window\)|Related Stories)/.test(l));
  const body = lines.slice(di + 1, endIdx > 0 ? endIdx : undefined).join('\n');
  const [mon, day, year] = lines[di].replace(',', '').split(' ');
  const date = `${year}-${String(MONTHS.indexOf(mon) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  return { title, date, body };
}

/** Página oficial "Only in Leonida": perfis oficiais dos personagens (renderizada como navegador comum). */
export async function rockstarOnlyInLeonida(): Promise<RawItem> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: UA });
    const url = 'https://www.rockstargames.com/VI/only-in-leonida';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
    for (let k = 0; k < 25; k++) {
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(300);
    }
    const text: string = await page.evaluate(() => document.body.innerText);
    const body = text.slice(text.indexOf('JASON DUVAL'), text.indexOf('GET ROCKSTAR PROPAGANDA'));
    return {
      title: 'Only in Leonida: perfis oficiais dos personagens',
      summary: 'Perfis oficiais de Jason, Lucia, Boobie Ike, Dre\'Quan Priest, Real Dimez, Raul Bautista e Brian Heder.',
      evidence: body,
      url,
      publishedAt: new Date().toISOString(),
      source: { kind: 'rockstar_site', name: 'rockstargames.com/VI/only-in-leonida', url },
    };
  } finally {
    await browser.close();
  }
}
