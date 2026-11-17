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
  const coverConcept = `Fundo asfalto, número/frase principal da tela 1 ("${s.beats[0].onScreen}") em Anton amarelo, selo CONFIRMADO. Sem arte oficial, sem imagem gerada por IA.`;
  const md = `# Metadados — ${s.id}\n\n**Título:** ${title}\n\n**Gancho (0–2s):** ${s.hook}\n\n**Capa:** ${coverConcept}\n\n**Spoiler:** não\n\n**Descrição:**\n\n\`\`\`\n${description}\n\`\`\`\n\n**Tags temáticas:** ${tags.join(', ')}\n\n**Categoria:** Jogos (20)\n`;
  return { title, hook: s.hook, coverConcept, description, tags, spoiler: false, markdown: md };
}
