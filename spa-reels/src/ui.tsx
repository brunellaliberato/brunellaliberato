import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

export const { fontFamily } = loadFont("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "latin-ext"] });

// Identidade SPA
export const AZUL = "#00AEEF";
export const AZUL_ESCURO = "#1B2A4A";
export const DOURADO = "#FFC94D";

/** 0→1 com mola a partir de `from` (frames), e 1→0 ao sair em `to` */
export const useEnter = (from: number, to = Infinity) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: frame - from, fps, config: { damping: 18, stiffness: 140 } });
  const out = to === Infinity ? 1 : interpolate(frame, [to - 8, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(inn, out);
};

const glass: React.CSSProperties = {
  background: "rgba(27, 42, 74, 0.82)",
  border: "2px solid rgba(0, 174, 239, 0.45)",
  borderRadius: 30,
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const fmt = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Caixa de número no topo, com contador subindo */
export const StatCard: React.FC<{
  from: number; to?: number; valueFrom: number; valueTo: number; decimals?: number;
  unit?: string; title: string; color?: string; noGrouping?: boolean;
}> = ({ from, to, valueFrom, valueTo, decimals = 0, unit, title, color = AZUL, noGrouping }) => {
  const frame = useCurrentFrame();
  const a = useEnter(from, to);
  const p = interpolate(frame, [from + 3, from + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - (1 - x) ** 3 });
  const v = valueFrom + (valueTo - valueFrom) * p;
  const txt = noGrouping ? v.toFixed(decimals) : fmt(v, decimals);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 230, padding: "30px 40px", ...glass, opacity: a, transform: `translateY(${(1 - a) * -30}px)` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontSize: 112, fontWeight: 800, color, lineHeight: 1, letterSpacing: -2 }}>{txt}</span>
        {unit && <span style={{ fontSize: 46, fontWeight: 700, color: "white" }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 34, fontWeight: 600, color: "rgba(255,255,255,0.88)", marginTop: 12 }}>{title}</div>
    </div>
  );
};

/** Comparação de áreas em barras */
export const CompareCard: React.FC<{ from: number; to?: number; rows: { label: string; value: number; color: string; note?: string }[] }> = ({ from, to, rows }) => {
  const frame = useCurrentFrame();
  const a = useEnter(from, to);
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 230, padding: "30px 40px", ...glass, opacity: a, transform: `translateY(${(1 - a) * -30}px)` }}>
      <div style={{ fontSize: 34, fontWeight: 700, color: "white", marginBottom: 22 }}>Área total (km²)</div>
      {rows.map((r, i) => {
        const p = interpolate(frame, [from + 6 + i * 6, from + 34 + i * 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - (1 - x) ** 3 });
        return (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
            <div style={{ width: 250, fontSize: 32, fontWeight: 700, color: "white" }}>{r.label}</div>
            <div style={{ flex: 1, height: 52, background: "rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ width: `${(r.value / max) * 100 * p}%`, height: "100%", background: r.color, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, boxSizing: "border-box" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: AZUL_ESCURO }}>{fmt(r.value * p)}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>Fontes: IBGE (2022) · INE Portugal</div>
    </div>
  );
};

/** Etiqueta arredondada */
export const Pill: React.FC<{ x: number; y: number; from: number; to?: number; text: string; bg?: string; color?: string; size?: number }> = ({ x, y, from, to, text, bg = AZUL, color = AZUL_ESCURO, size = 34 }) => {
  const a = useEnter(from, to);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * a})`, opacity: a, background: bg, color, fontSize: size, fontWeight: 800, padding: "12px 28px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
      {text}
    </div>
  );
};

/** Ponto no mapa com rótulo */
export const Pin: React.FC<{ x: number; y: number; from: number; to?: number; label?: string; labelSide?: "right" | "left"; color?: string }> = ({ x, y, from, to, label, labelSide = "right", color = "white" }) => {
  const frame = useCurrentFrame();
  const a = useEnter(from, to);
  const pulse = ((frame - from) % 45) / 45;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: a }}>
      <div style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 99, border: `3px solid ${AZUL}`, opacity: 1 - pulse, transform: `scale(${0.4 + pulse})` }} />
      <div style={{ position: "absolute", left: -13, top: -13, width: 26, height: 26, borderRadius: 99, background: color, border: `6px solid ${AZUL}`, boxSizing: "border-box" }} />
      {label && (
        <div style={{ position: "absolute", top: -26, [labelSide === "right" ? "left" : "right"]: 34, background: "rgba(10,18,34,0.85)", border: "2px solid rgba(255,255,255,0.35)", color: "white", fontSize: 30, fontWeight: 700, padding: "6px 16px", borderRadius: 12, whiteSpace: "nowrap" } as React.CSSProperties}>
          {label}
        </div>
      )}
    </div>
  );
};

/** Foto em cartão branco ligada ao ponto do mapa por uma linha */
export const PhotoCard: React.FC<{ x: number; y: number; dx: number; dy: number; from: number; to?: number; src: string; label: string; w?: number; h?: number }> = ({ x, y, dx, dy, from, to, src, label, w = 470, h = 330 }) => {
  const a = useEnter(from, to);
  const cx = x + dx;
  const cy = y + dy;
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: a }} width={1} height={1}>
        <line x1={x} y1={y} x2={cx} y2={cy + h / 2} stroke="white" strokeWidth={4} strokeDasharray={`${a * 600} 600`} />
      </svg>
      <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, opacity: a, transform: `scale(${0.8 + 0.2 * a}) translateY(${(1 - a) * 30}px)`, transformOrigin: "50% 100%", borderRadius: 24, border: "7px solid white", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.55)", background: "#222" }}>
        <Img src={staticFile(`fotos/${src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "40px 18px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.75))", color: "white", fontSize: 30, fontWeight: 700 }}>{label}</div>
      </div>
    </>
  );
};

/** Texto com **destaques** em azul */
export const Rich: React.FC<{ text: string; hi?: string }> = ({ text, hi = AZUL }) => (
  <>
    {text.split("**").map((part, i) => (
      <span key={i} style={i % 2 ? { color: hi } : undefined}>{part}</span>
    ))}
  </>
);

export type CaptionChunk = { text: string; start: number; end: number };

/** Legenda grande no terço de baixo */
export const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const c = chunks.find((ch) => t >= ch.start && t < ch.end);
  if (!c) return null;
  const local = frame - Math.round(c.start * fps);
  const a = spring({ frame: local, fps, config: { damping: 20, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1190, display: "flex", justifyContent: "center" }}>
      <div style={{ fontSize: 66, fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1.16, letterSpacing: -0.5, textShadow: "0 4px 18px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)", opacity: a, transform: `translateY(${(1 - a) * 18}px)` }}>
        <Rich text={c.text} />
      </div>
    </div>
  );
};
