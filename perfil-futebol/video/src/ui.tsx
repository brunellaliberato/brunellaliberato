import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { continueRender, delayRender, staticFile } from "remotion";

// Fontes servidas da pasta public/fonts (não depende do Google Fonts na hora do render).
// Inter é fonte variável: um arquivo cobre os pesos 600 a 900.
export const ANTON = "AntonLocal";
export const INTER = "InterLocal";
if (typeof document !== "undefined") {
  const espera = delayRender("fontes");
  Promise.all([
    new FontFace(ANTON, `url(${staticFile("fonts/anton-latin.woff2")}) format("woff2")`, { weight: "400" }).load(),
    new FontFace(INTER, `url(${staticFile("fonts/inter-latin.woff2")}) format("woff2")`, { weight: "100 900" }).load(),
  ]).then((fs) => { fs.forEach((f) => document.fonts.add(f)); continueRender(espera); });
}

export const OURO = "#F5C518";
export const OURO_ESCURO = "#B8860B";
export const VERMELHO = "#E53935";
export const VERDE = "#43A047";
export const FUNDO = "#0A0A0E";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (x: number) => 1 - (1 - x) ** 3;

/** 0→1 com mola a partir do frame `from` */
export const useSpring = (from: number, stiffness = 150, damping = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - from, fps, config: { damping, stiffness } });
};

export const lerp = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], { ...clamp, easing: ease });

/** Fundo escuro com luz central, granulado e vinheta */
export const Fundo: React.FC<{ luz?: string }> = ({ luz = "rgba(245,197,24,0.10)" }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: FUNDO }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 45% at 50% 52%, ${luz}, transparent 70%)` }} />
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: 0.09, mixBlendMode: "screen" }}>
        <filter id="grao">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 7} />
        </filter>
        <rect width="1080" height="1920" filter="url(#grao)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />
    </>
  );
};

/** Selo da série no topo */
export const Selo: React.FC<{ serie: string; parte: string }> = ({ serie, parte }) => (
  <div style={{ position: "absolute", top: 130, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 5 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", border: `2px solid ${OURO}`, borderRadius: 999,
      fontFamily: INTER, fontWeight: 700, fontSize: 28, letterSpacing: 3, color: OURO, background: "rgba(0,0,0,0.55)" }}>
      <span style={{ width: 14, height: 14, borderRadius: 7, background: OURO }} />
      {serie} · {parte}
    </div>
  </div>
);

export type Linha = { t: string; caixa?: boolean; cor?: string; at?: number };

/** Título grande em duas ou três linhas; `caixa` = faixa dourada com texto preto */
export const Titulo: React.FC<{ linhas: Linha[]; top?: number; size?: number }> = ({ linhas, top = 290, size = 128 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top, left: 70, right: 70, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
      {linhas.map((l, i) => {
        const from = l.at ?? i * 5;
        const s = spring({ frame: frame - from, fps, config: { damping: 15, stiffness: 170 } });
        return (
          <div key={i} style={{
            fontFamily: ANTON, fontSize: size, lineHeight: 1.02, textTransform: "uppercase",
            color: l.caixa ? "#0A0A0E" : l.cor ?? "white",
            background: l.caixa ? OURO : "transparent", padding: l.caixa ? "2px 18px 6px" : 0,
            opacity: s, transform: `translateY(${(1 - s) * 40}px)`,
            textShadow: l.caixa ? "none" : "0 6px 24px rgba(0,0,0,0.6)",
          }}>{l.t}</div>
        );
      })}
    </div>
  );
};

/** Etiqueta com ícone (✓ / ✕ / texto) */
export const Tag: React.FC<{ x: number; y: number; at: number; texto: string; cor?: string; corTexto?: string; size?: number; rot?: number }> =
  ({ x, y, at, texto, cor = OURO, corTexto = "#0A0A0E", size = 40, rot = 0 }) => {
    const s = useSpring(at, 220, 13);
    return (
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s}) rotate(${rot}deg)`,
        background: cor, color: corTexto, fontFamily: INTER, fontWeight: 900, fontSize: size, padding: "10px 22px",
        borderRadius: 12, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", letterSpacing: 1 }}>
        {texto}
      </div>
    );
  };

/** Taça estilizada (figura alada segurando o copo, base azul) */
export const Taca: React.FC<{ size?: number; brilho?: number; opacity?: number; contorno?: boolean }> = ({ size = 460, brilho = 1, opacity = 1, contorno }) => {
  const gold = contorno ? "none" : "url(#ouro)";
  const stroke = contorno ? "rgba(255,255,255,0.55)" : "none";
  const dash = contorno ? "10 10" : undefined;
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 200 320" style={{ opacity, overflow: "visible",
      filter: contorno ? "none" : `drop-shadow(0 0 ${30 * brilho}px rgba(245,197,24,${0.45 * brilho}))` }}>
      <defs>
        <linearGradient id="ouro" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="0.35" stopColor="#F5C518" />
          <stop offset="0.7" stopColor="#B8860B" />
          <stop offset="1" stopColor="#FFE066" />
        </linearGradient>
        <linearGradient id="lapis" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2A4BA0" />
          <stop offset="1" stopColor="#14275C" />
        </linearGradient>
      </defs>
      {/* copo octogonal */}
      <polygon points="58,30 142,30 152,48 138,78 62,78 48,48" fill={gold} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      {/* asas */}
      <path d="M100,150 C70,130 40,100 52,58 C62,90 78,110 100,120 Z" fill={gold} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      <path d="M100,150 C130,130 160,100 148,58 C138,90 122,110 100,120 Z" fill={gold} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      {/* corpo */}
      <path d="M86,82 L114,82 L120,150 L128,230 L72,230 L80,150 Z" fill={gold} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      <circle cx="100" cy="92" r="11" fill={gold} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      {/* base */}
      <rect x="60" y="230" width="80" height="14" fill={gold} stroke={stroke} strokeWidth="2" strokeDasharray={dash} />
      <path d="M56,244 L144,244 L150,300 L50,300 Z" fill={contorno ? "none" : "url(#lapis)"} stroke={contorno ? stroke : "#F5C518"} strokeWidth="3" strokeDasharray={dash} />
    </svg>
  );
};

/** Legenda grande, um bloco por vez, com destaques em dourado */
export const Legenda: React.FC<{ blocos: { texto: string; ini: number; fim: number }[] }> = ({ blocos }) => {
  const frame = useCurrentFrame();
  const atual = blocos.find((b) => frame >= b.ini && frame < b.fim);
  if (!atual) return null;
  const s = spring({ frame: frame - atual.ini, fps: 30, config: { damping: 14, stiffness: 260 } });
  const partes = atual.texto.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1420, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 64, lineHeight: 1.15, textAlign: "center", color: "white",
        transform: `scale(${0.85 + 0.15 * s})`, opacity: s,
        textShadow: "0 0 12px rgba(0,0,0,0.95), 0 4px 0 rgba(0,0,0,0.9), 0 -2px 0 rgba(0,0,0,0.9), 3px 0 0 rgba(0,0,0,0.9), -3px 0 0 rgba(0,0,0,0.9)" }}>
        {partes.map((p, i) => p.startsWith("**")
          ? <span key={i} style={{ color: OURO }}>{p.slice(2, -2)}</span>
          : <span key={i}>{p}</span>)}
      </div>
    </div>
  );
};

/** Vitrine: moldura de madeira + vidro + taça. `soltar` 0→1 arranca a moldura. */
export const Vitrine: React.FC<{ alertaMadeira?: number; brilhoVidro?: number; soltar?: number; semTaca?: number }> =
  ({ alertaMadeira = 0, brilhoVidro = 0, soltar = 0, semTaca = 0 }) => {
    const W = 620, H = 760, B = 46;
    const madeira = (w: number, h: number, vertical: boolean): React.CSSProperties => ({
      width: w, height: h, position: "absolute",
      background: vertical
        ? "repeating-linear-gradient(90deg, #7A4A22 0 9px, #8B5A2B 9px 15px, #6B3F1C 15px 22px)"
        : "repeating-linear-gradient(0deg, #7A4A22 0 9px, #8B5A2B 9px 15px, #6B3F1C 15px 22px)",
      boxShadow: alertaMadeira > 0 ? `0 0 ${40 * alertaMadeira}px rgba(229,57,53,${alertaMadeira}), inset 0 0 0 ${4 * alertaMadeira}px ${VERMELHO}` : "inset 0 0 12px rgba(0,0,0,0.5)",
    });
    const voa = (dx: number, dy: number, r: number) => ({
      transform: `translate(${dx * soltar}px, ${dy * soltar + 600 * soltar * soltar}px) rotate(${r * soltar}deg)`,
      opacity: 1 - Math.max(0, soltar - 0.7) / 0.3,
    });
    return (
      <div style={{ position: "relative", width: W, height: H }}>
        {/* parede atrás */}
        <div style={{ position: "absolute", inset: B, background: "linear-gradient(180deg,#1b1b24,#0f0f15)" }} />
        {/* taça */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center", opacity: 1 - semTaca }}>
          <Taca size={330} />
        </div>
        {semTaca > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center", opacity: semTaca }}>
            <Taca size={330} contorno />
          </div>
        )}
        {/* vidro */}
        <div style={{ position: "absolute", inset: B, background: "linear-gradient(135deg, rgba(160,210,255,0.18), rgba(160,210,255,0.05))",
          border: "2px solid rgba(200,230,255,0.35)", overflow: "hidden",
          transform: `translate(${380 * soltar}px, ${40 * soltar}px) rotate(${10 * soltar}deg)` }}>
          <div style={{ position: "absolute", top: -200, bottom: -200, width: 120, left: -200 + brilhoVidro * 1000,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", transform: "rotate(20deg)" }} />
        </div>
        {/* moldura de madeira: 4 peças */}
        <div style={{ ...madeira(W, B, false), left: 0, top: 0, ...voa(-120, -200, -35) }} />
        <div style={{ ...madeira(W, B, false), left: 0, top: H - B, ...voa(80, 100, 20) }} />
        <div style={{ ...madeira(B, H, true), left: 0, top: 0, ...voa(-260, 0, -50) }} />
        <div style={{ ...madeira(B, H, true), left: W - B, top: 0, ...voa(260, -50, 45) }} />
      </div>
    );
  };
