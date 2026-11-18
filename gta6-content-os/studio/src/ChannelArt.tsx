import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { color, fonts, sticker } from './brand';

export interface ChannelArtProps {
  name: string;
  handle: string;
  tagline: string;
  bg: string;
  mark: string;
  markSize?: number;
  [key: string]: unknown;
}

/** Foto de perfil 800x800: monograma em adesivo sobre o pôr do sol (legível em 98px, o tamanho real no celular). */
export const Avatar: React.FC<ChannelArtProps> = ({ mark, markSize }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${color.skyTop} 0%, ${color.skyMauve} 40%, ${color.skyPink} 70%, ${color.skyOrange} 100%)`, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: `linear-gradient(180deg, ${color.sun}, ${color.hotPink})`, top: 250, opacity: 0.9, zIndex: 0 }} />
    <div style={{ position: 'relative', zIndex: 1, fontFamily: fonts.display, fontSize: markSize ?? 300, lineHeight: 1, letterSpacing: '-0.04em', ...sticker(22, 22) }}>{mark}</div>
  </AbsoluteFill>
);

/** Banner 2560x1440. Área segura (aparece em todo aparelho): 1546x423 no centro. */
export const Banner: React.FC<ChannelArtProps> = ({ name, tagline, bg }) => (
  <AbsoluteFill style={{ background: color.ink }}>
    <Img src={staticFile(bg)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${color.skyTop}66, ${color.ink}cc)` }} />
    <div style={{ position: 'absolute', left: (2560 - 1546) / 2, top: (1440 - 423) / 2, width: 1546, height: 423, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ fontFamily: fonts.display, fontSize: 168, lineHeight: 1, whiteSpace: 'nowrap', ...sticker(16, 16) }}>{name}</div>
      <div style={{ fontFamily: fonts.neon, fontSize: 92, color: color.sun, WebkitTextStroke: `7px ${color.ink}`, paintOrder: 'stroke fill' }}>{tagline}</div>
    </div>
  </AbsoluteFill>
);
