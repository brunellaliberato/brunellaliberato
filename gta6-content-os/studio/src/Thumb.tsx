import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { color, fonts, sticker } from './brand';

/** Capa 1280x720: imagem oficial + 2 a 4 palavras em adesivo + selo. Nunca promete o que o vídeo não mostra. */
export interface ThumbProps {
  bg: string;
  position?: string;
  title: string;
  sub?: string;
  tag?: string;
  [key: string]: unknown;
}

export const Thumb: React.FC<ThumbProps> = ({ bg, position, title, sub, tag }) => (
  <AbsoluteFill style={{ background: color.ink }}>
    <Img src={staticFile(bg)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: position ?? '50% 50%' }} />
    <AbsoluteFill style={{ background: `linear-gradient(90deg, ${color.ink}ee 0%, ${color.ink}88 38%, transparent 62%)` }} />
    <div style={{ position: 'absolute', left: 56, top: 0, bottom: 0, width: 760, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      {tag && (
        <div style={{ alignSelf: 'flex-start', background: color.confirmado, color: color.ink, border: `6px solid ${color.ink}`, boxShadow: `5px 7px 0 ${color.ink}`, padding: '6px 18px', borderRadius: 14, fontFamily: fonts.display, fontSize: 34, transform: 'rotate(-3deg)' }}>✓ {tag}</div>
      )}
      <div style={{ fontFamily: fonts.display, fontSize: 132, lineHeight: 0.95, ...sticker(14, 14) }}>{title}</div>
      {sub && <div style={{ fontFamily: fonts.neon, fontSize: 84, color: color.sun, WebkitTextStroke: `7px ${color.ink}`, paintOrder: 'stroke fill', lineHeight: 0.9 }}>{sub}</div>}
    </div>
  </AbsoluteFill>
);
