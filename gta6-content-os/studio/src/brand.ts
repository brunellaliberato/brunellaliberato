/**
 * Design tokens do canal SEIS ESTRELAS — tema "Pôr do sol de Leonida" (v2).
 *
 * Inspirado na ESTÉTICA do GTA VI (pôr do sol rosa/roxo/laranja, palmeiras, neon, adesivos
 * com contorno), sem usar marcas da Rockstar: nada de logo "VI", letreiro "grand theft auto",
 * logo R★ ou key art oficial. Todo elemento gráfico aqui é desenhado pelo canal.
 */
import { continueRender, delayRender, staticFile } from 'remotion';

/** Fontes embutidas (studio/public/fonts, licença SIL OFL). */
const FACES: [family: string, file: string, weight: string][] = [
  ['SE Bowlby', 'bowlby-400.woff2', '400'],
  ['SE Neon', 'yellowtail-400.woff2', '400'],
  ['SE Inter', 'inter-500.woff2', '500'],
  ['SE Inter', 'inter-700.woff2', '700'],
  ['SE Inter', 'inter-900.woff2', '900'],
  ['SE Mono', 'jbmono-500.woff2', '500'],
  ['SE Mono', 'jbmono-700.woff2', '700'],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fontes locais');
  Promise.all(
    FACES.map(([family, file, weight]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('falha ao carregar fontes', e);
      continueRender(handle);
    });
}

export const fonts = {
  /** títulos e números: grossa, arredondada, "adesivo" */
  display: "'SE Bowlby', 'SE Inter', sans-serif",
  /** detalhes cursivos tipo letreiro neon (nunca para informação essencial) */
  neon: "'SE Neon', cursive",
  body: "'SE Inter', 'DejaVu Sans', sans-serif",
  mono: "'SE Mono', 'DejaVu Sans Mono', monospace",
};

export const color = {
  // céu (de cima para baixo), amostrado das referências
  skyTop: '#5B4A86',
  skyMauve: '#9C74A8',
  skyPink: '#DE8F95',
  skyOrange: '#F4A274',
  skyGlow: '#FFC77A',
  water: '#7D6BAE',
  // silhuetas
  silhouette: '#4A3570',
  silhouetteFar: '#8E78B4',
  // tinta
  ink: '#1E0F2E', // contorno de adesivo / painéis
  panel: '#2B1640',
  white: '#FFFFFF',
  text: '#FFFFFF',
  muted: '#F2DDEB',
  hotPink: '#FF4FA3',
  magenta: '#A53276',
  aqua: '#3FD6E0',
  sun: '#FFD36B',
  // compatibilidade com templates antigos
  bg: '#2B1640',
  bgRaised: '#2B1640',
  line: '#ffffff44',
  signal: '#FFD36B',
  // selos de status (cores fixas: são informação, não decoração)
  confirmado: '#22C55E',
  terceiros: '#3FD6E0',
  rumor: '#FF3B5C',
  teoria: '#A78BFA',
  opiniao: '#FFD36B',
  naoAnunciado: '#9CA3AF',
};

export type Seal = 'CONFIRMADO' | 'TERCEIROS' | 'RUMOR' | 'TEORIA' | 'OPINIAO' | 'NAO_ANUNCIADO';

export const sealStyle: Record<Seal, { label: string; color: string }> = {
  CONFIRMADO: { label: 'CONFIRMADO', color: color.confirmado },
  TERCEIROS: { label: 'TERCEIROS', color: color.terceiros },
  RUMOR: { label: 'RUMOR', color: color.rumor },
  TEORIA: { label: 'TEORIA', color: color.teoria },
  OPINIAO: { label: 'OPINIÃO', color: color.opiniao },
  NAO_ANUNCIADO: { label: 'NÃO ANUNCIADO', color: color.naoAnunciado },
};

/** Texto "adesivo": branco, contorno ameixa grosso e sombra deslocada (legível sobre o céu). */
export const sticker = (stroke = 10, shadow = 10) => ({
  color: color.white,
  WebkitTextStroke: `${stroke}px ${color.ink}`,
  paintOrder: 'stroke fill' as const,
  textShadow: `${shadow * 0.6}px ${shadow}px 0 ${color.ink}`,
});

/** Área segura para Shorts: a UI do YouTube cobre ~ rodapé e lateral direita. */
export const safe = { top: 220, bottom: 420, left: 72, right: 150 };
