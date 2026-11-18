/**
 * MÓDULO G — THUMBNAIL & SEO
 * Gera metadados a partir do ROTEIRO (nunca de fora dele): título/descrição não podem prometer
 * nada que o vídeo não mostre. As fontes do roteiro vão para a descrição automaticamente.
 */
import type { Script } from '../../core/types.js';

const DISCLAIMER = 'Canal de fã, sem vínculo com a Rockstar Games ou a Take-Two Interactive. Todas as informações têm fonte oficial linkada acima.';

export interface ShortMeta {
  title: string;
  hook: string;
  coverConcept: string;
  description: string;
  tags: string[];
  spoiler: boolean;
  markdown: string;
}

export function shortMetadata(s: Script): ShortMeta {
  const title = s.title.length <= 70 ? s.title : s.title.slice(0, 67) + '…';
  const sources = s.sources.map((x) => `• ${x.name}: ${x.url}`).join('\n');
  const description = [s.promise, '', 'Fontes:', sources, '', DISCLAIMER, '', '#GTA6 #GTAVI #Shorts'].join('\n');
  const tags = ['GTA 6', 'GTA VI', 'Grand Theft Auto VI', 'notícias GTA 6', 'Rockstar', 'lançamento GTA 6'];
  const coverConcept = `Fundo asfalto, número/frase principal da tela 1 ("${s.beats[0].onScreen}") em adesivo branco, selo verde e crédito "IMAGEM: ROCKSTAR GAMES". Nunca imagem gerada por IA.`;
  const md = `# Metadados — ${s.id}\n\n**Título:** ${title}\n\n**Gancho (0–2s):** ${s.hook}\n\n**Capa:** ${coverConcept}\n\n**Spoiler:** não\n\n**Descrição:**\n\n\`\`\`\n${description}\n\`\`\`\n\n**Tags temáticas:** ${tags.join(', ')}\n\n**Categoria:** Jogos (20)\n`;
  return { title, hook: s.hook, coverConcept, description, tags, spoiler: false, markdown: md };
}

/** Capítulos do YouTube a partir da montagem real (primeiro em 0:00, mínimo 3, cada um com 10 s ou mais). */
export function chaptersFromProps(props: { fps: number; beats: { from: number; layout: { kind: string; name?: string } }[] }, introTitle = 'Abertura'): string[] {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const marks: { t: number; title: string }[] = [{ t: 0, title: introTitle }];
  let mapAdded = false;
  for (const b of props.beats) {
    const t = b.from / props.fps;
    if (b.layout.kind === 'chapter' && b.layout.name) marks.push({ t, title: b.layout.name.toLowerCase().replace(/(^|[\s'])\p{L}/gu, (m) => m.toUpperCase()) });
    if (b.layout.kind === 'map' && !mapAdded) { marks.push({ t, title: 'Como todos se conectam' }); mapAdded = true; }
  }
  const ok = marks.filter((m, i) => i === marks.length - 1 || marks[i + 1].t - m.t >= 10);
  return ok.length >= 3 ? ok.map((m) => `${fmt(m.t)} ${m.title}`) : [];
}

export function longMetadata(s: Script, props: Parameters<typeof chaptersFromProps>[0], extra: { titles: string[]; thumbs: string[]; tags: string[] }): string {
  const chapters = chaptersFromProps(props);
  const sources = s.sources.map((x) => `• ${x.name}: ${x.url}`).join('\n');
  const desc = [s.promise, '', ...chapters, '', 'Fontes:', sources, '', DISCLAIMER, '', '#GTA6 #GTAVI #Leonida'].join('\n');
  return [
    `# Pacote de publicação — ${s.id}`,
    '',
    '## 5 opções de título (sem prometer o que o vídeo não mostra)',
    ...extra.titles.map((t, i) => `${i + 1}. ${t}`),
    '',
    '## 3 conceitos de capa',
    ...extra.thumbs.map((t, i) => `${i + 1}. ${t}`),
    '',
    '## Descrição (com capítulos gerados da montagem real)',
    '```',
    desc,
    '```',
    '',
    `**Tags temáticas:** ${extra.tags.join(', ')}`,
    '',
    '**Categoria:** Jogos (20) · **Idioma:** Português (Brasil) · **Público:** não é para crianças',
    '',
    '**Sugestão de publicação:** véspera ou dia do lançamento (18–19/11), 19h BRT; fixar comentário perguntando "qual personagem você quer conhecer primeiro?".',
  ].join('\n');
}
