import React from "react";
import { AbsoluteFill } from "remotion";
import { ANTON } from "./ui";

const OURO = "#F5C518";
const PRETO = "#0A0A0E";

/** Fotos de perfil @portrasdolance. O Instagram corta em círculo: tudo importante fica no centro. */
export const Avatar: React.FC<{ v: "A" | "B" | "C" }> = ({ v }) => {
  if (v === "A") {
    // Wordmark no estilo dos títulos dos vídeos
    return (
      <AbsoluteFill style={{ background: PRETO, alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: "rotate(-4deg)" }}>
          <div style={{ fontFamily: ANTON, fontSize: 230, lineHeight: 0.95, color: "white", letterSpacing: 2 }}>POR TRÁS</div>
          <div style={{ fontFamily: ANTON, fontSize: 230, lineHeight: 0.95, color: PRETO, background: OURO, padding: "6px 34px 16px" }}>DO LANCE</div>
        </div>
      </AbsoluteFill>
    );
  }
  if (v === "B") {
    // Monograma: P e L grandes em preto sobre dourado
    return (
      <AbsoluteFill style={{ background: OURO, alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: ANTON, fontSize: 620, color: PRETO, letterSpacing: -10, lineHeight: 1, marginTop: -30 }}>PL</div>
      </AbsoluteFill>
    );
  }
  // C: fechadura dourada com a bola "espiando" dentro (ver por trás)
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, #1a1a22, #0A0A0E 70%)", alignItems: "center", justifyContent: "center" }}>
      <svg width="1080" height="1080" viewBox="0 0 1080 1080">
        <defs>
          <linearGradient id="ourC" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#FFF3B0" />
            <stop offset="0.45" stopColor="#F5C518" />
            <stop offset="1" stopColor="#B8860B" />
          </linearGradient>
          <clipPath id="fech">
            <circle cx="540" cy="430" r="190" />
            <polygon points="440,520 640,520 720,860 360,860" />
          </clipPath>
        </defs>
        {/* fechadura */}
        <circle cx="540" cy="430" r="190" fill="url(#ourC)" />
        <polygon points="440,520 640,520 720,860 360,860" fill="url(#ourC)" />
        {/* luz do outro lado: gramado e a bola */}
        <g clipPath="url(#fech)">
          <rect x="300" y="230" width="480" height="640" fill="url(#ourC)" />
          <ellipse cx="540" cy="900" rx="420" ry="250" fill="#1E7A3C" opacity="0.0" />
        </g>
        <circle cx="540" cy="430" r="118" fill={PRETO} />
        <polygon points="482,520 598,520 650,800 430,800" fill={PRETO} />
        <circle cx="540" cy="455" r="70" fill="white" />
        <polygon points="540,415 578,443 564,488 516,488 502,443" fill={PRETO} />
      </svg>
    </AbsoluteFill>
  );
};
