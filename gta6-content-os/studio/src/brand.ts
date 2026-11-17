/** Design tokens do canal SEIS ESTRELAS (provisório). Fonte única de verdade para todos os templates. */
import { continueRender, delayRender, staticFile } from 'remotion';

/**
 * Fontes embutidas (studio/public/fonts, licença SIL OFL) — render offline e determinístico.
 * Anton (títulos), Inter (texto), JetBrains Mono (dados/fontes).
 */
const FACES: [family: string, file: string, weight: string][] = [
  ['SE Anton', 'anton-400.woff2', '400'],
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
  display: "'SE Anton', Impact, sans-serif",
  body: "'SE Inter', 'DejaVu Sans', sans-serif",
  mono: "'SE Mono', 'DejaVu Sans Mono', monospace",
};

export const color = {
  bg: '#0E0F12',
  bgRaised: '#17191E',
  line: '#2A2D35',
  text: '#F4F1EA',
  muted: '#9A9AA3',
  signal: '#FFD23F',
  confirmado: '#2BD576',
  terceiros: '#3FD0FF',
  rumor: '#FF4D4D',
  teoria: '#A98BFF',
  opiniao: '#FFD23F',
  naoAnunciado: '#8A8F98',
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

/** Área segura para Shorts: a UI do YouTube cobre ~ rodapé e lateral direita. */
export const safe = { top: 220, bottom: 420, left: 72, right: 150 };
