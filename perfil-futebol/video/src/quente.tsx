// Base das "Pautas quentes": tempos dos trechos, legenda sincronizada, escudos genéricos e peças comuns.
// Cada vídeo novo (QuenteNN.tsx) só monta as cenas; o resto vem daqui.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ANTON, Fundo, INTER, OURO, useSpring, VERMELHO } from "./ui";

export const FPS = 30;
export const INICIO = 8; // frames antes da narração
export const CAUDA = 60; // tela final

type Roteiro = { segmentos: { id: string; fala: string; legenda: string }[] };
type Palavra = { w: string; s: number; e: number };
export type Seg = { id: string; fala: string; legenda: string; ini: number; len: number };

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** Junta roteiro + tempos (alinha.py) e devolve trechos, blocos de legenda e `momento()` */
export const montar = (roteiro: Roteiro, inicios: Record<string, number>, duracoes: Record<string, number>, palavras: Record<string, Palavra[]>) => {
  const segs: Seg[] = roteiro.segmentos.map((s) => {
    const ini = INICIO + Math.round(inicios[s.id] * FPS);
    const fim = INICIO + Math.round((inicios[s.id] + duracoes[s.id]) * FPS);
    return { ...s, ini, len: fim - ini };
  });
  const ultimo = segs[segs.length - 1];
  const seg = (id: string) => segs.find((s) => s.id === id)!;
  const blocos = segs.flatMap((s) => {
    const partes = s.legenda.split("|").map((p) => p.trim());
    const ws = palavras[s.id] ?? [];
    const contagem = partes.map((p) => p.replace(/\*/g, "").split(/\s+/).filter(Boolean).length);
    const totalL = contagem.reduce((a, b) => a + b, 0);
    let acum = 0;
    const ini = partes.map((_, i) => {
      const idx = ws.length ? Math.min(ws.length - 1, Math.round((acum * ws.length) / totalL)) : 0;
      const t = ws.length ? s.ini + Math.round(ws[idx].s * FPS) : s.ini + Math.round((acum / totalL) * s.len);
      acum += contagem[i];
      return i === 0 ? s.ini : t;
    });
    return partes.map((texto, i) => ({ texto, ini: ini[i], fim: i + 1 < partes.length ? ini[i + 1] : s.ini + s.len }));
  });
  /** frame (relativo ao trecho) em que a palavra é dita; `n` = qual ocorrência; `frac` = plano B */
  const momento = (id: string, palavra: string, frac: number, n = 0) => {
    const ws = (palavras[id] ?? []).filter((p) => norm(p.w).startsWith(norm(palavra)));
    const w = ws[n] ?? ws[0];
    return w ? Math.round(w.s * FPS) : Math.round(seg(id).len * frac);
  };
  return { segs, seg, blocos, momento, total: ultimo.ini + ultimo.len + CAUDA, fimFala: ultimo.ini + ultimo.len };
};

export const Cena: React.FC<{ children: React.ReactNode; len: number; zoom?: number }> = ({ children, len, zoom = 0.04 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${1 + zoom * (f / len)})`, transformOrigin: "50% 60%" }}>{children}</AbsoluteFill>;
};

export type Time = { sigla: string; nome: string; cores: string[] };
export const TIMES = {
  COR: { sigla: "COR", nome: "Corinthians", cores: ["#111111", "#FFFFFF"] },
  GRE: { sigla: "GRE", nome: "Grêmio", cores: ["#0D80BF", "#111111", "#FFFFFF"] },
  FLA: { sigla: "FLA", nome: "Flamengo", cores: ["#C8102E", "#111111"] },
  EST: { sigla: "EST", nome: "Estudiantes", cores: ["#D7141A", "#FFFFFF"] },
  PAL: { sigla: "PAL", nome: "Palmeiras", cores: ["#006437", "#FFFFFF"] },
} satisfies Record<string, Time>;

/** Escudo genérico com listras nas cores do time (nunca o escudo oficial) */
export const Escudo: React.FC<{ t: Time; size?: number; at?: number; nome?: boolean }> = ({ t, size = 300, at = 0, nome = true }) => {
  const s = useSpring(at, 180, 14);
  const n = t.cores.length;
  const id = `esc-${t.sigla}-${size}`;
  const forma = "M50,3 L95,15 L92,62 C88,88 70,103 50,112 C30,103 12,88 8,62 L5,15 Z";
  return (
    <div style={{ transform: `scale(${s}) translateY(${(1 - s) * 60}px)`, opacity: s, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 100 115">
        <defs><clipPath id={id}><path d={forma} /></clipPath></defs>
        <g clipPath={`url(#${id})`}>
          {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 10} y={0} width={10} height={115} fill={t.cores[i % n]} />)}
          <rect x="0" y="34" width="100" height="36" fill="rgba(0,0,0,0.72)" />
        </g>
        <path d={forma} fill="none" stroke={OURO} strokeWidth="3" />
        <text x="50" y="62" textAnchor="middle" fontFamily={ANTON} fontSize="28" fill="#FFFFFF" letterSpacing="1">{t.sigla}</text>
      </svg>
      {nome && <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: size * 0.17, color: "white", textTransform: "uppercase", letterSpacing: 2 }}>{t.nome}</div>}
    </div>
  );
};

/** Carimbo que bate na tela no frame `at` */
export const Carimbo: React.FC<{ at: number; texto: string; top: number; cor?: string; size?: number; rot?: number }> = ({ at, texto, top, cor = VERMELHO, size = 88, rot = -6 }) => {
  const f = useCurrentFrame();
  const s = useSpring(at, 320, 12);
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${2.2 - 1.2 * s}) rotate(${rot}deg)`, opacity: Math.min(1, s * 1.5), background: cor, color: "white",
        fontFamily: ANTON, fontSize: size, padding: "8px 34px 14px", letterSpacing: 2, textTransform: "uppercase", boxShadow: "0 20px 50px rgba(0,0,0,0.6)", whiteSpace: "nowrap" }}>
        {texto}
      </div>
    </div>
  );
};

const Sinal: React.FC<{ at: number; size: number; sinal: string }> = ({ at, size, sinal }) => {
  const s = useSpring(at + 2, 220, 14);
  return <div style={{ fontFamily: ANTON, fontSize: size * 0.48, color: OURO, opacity: s, transform: `scale(${s})` }}>{sinal}</div>;
};

/** Dois escudos lado a lado com um sinal no meio (=, ×, ?) */
export const Duelo: React.FC<{ a: Time; b: Time; at?: number; sinal?: string; size?: number; top?: number }> = ({ a, b, at = 0, sinal = "×", size = 280, top = 440 }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
    <Escudo t={a} size={size} at={at} />
    <Sinal at={at} size={size} sinal={sinal} />
    <Escudo t={b} size={size} at={at + 3} />
  </div>
);

export const Final: React.FC<{ chamada: string }> = ({ chamada }) => {
  const s = useSpring(0, 160, 15);
  return (
    <AbsoluteFill>
      <Fundo />
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", opacity: s, transform: `scale(${0.9 + 0.1 * s})` }}>
        <div style={{ fontFamily: ANTON, fontSize: 120, color: "white", lineHeight: 1.05, textTransform: "uppercase" }}>Por trás<br />do lance</div>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 46, color: OURO, marginTop: 30 }}>{chamada}</div>
      </div>
    </AbsoluteFill>
  );
};
