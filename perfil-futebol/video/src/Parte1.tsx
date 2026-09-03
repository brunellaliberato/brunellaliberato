import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import roteiro from "./data/roteiro.json";
import duracoes from "./data/duracoes.json";
import palavras from "./data/palavras.json";
import inicios from "./data/inicios.json";
import { ANTON, Fundo, INTER, Legenda, lerp, OURO, Selo, Taca, Tag, Titulo, useSpring, VERDE, VERMELHO, Vitrine } from "./ui";

const FPS = 30;
const GAP = 0; // narração é uma tomada única: as cenas encostam umas nas outras
const INICIO = 8; // frame em que a narração começa
const CAUDA = 75; // tela final "Parte 2"

type Seg = { id: string; fala: string; legenda: string; ini: number; len: number };
const segs: Seg[] = [];
{
  const INI = inicios as Record<string, number>;
  const DUR = duracoes as Record<string, number>;
  for (const s of roteiro.segmentos) {
    const ini = INICIO + Math.round(INI[s.id] * FPS);
    const fim = INICIO + Math.round((INI[s.id] + DUR[s.id]) * FPS);
    segs.push({ ...s, ini, len: fim - ini });
  }
}
const ultimo = segs[segs.length - 1];
export const totalFrames = ultimo.ini + ultimo.len + CAUDA;
const seg = (id: string) => segs.find((s) => s.id === id)!;

/** Blocos de legenda: cada bloco entra no tempo real da 1ª palavra dele (palavras.json) */
const PALAVRAS = palavras as Record<string, { w: string; s: number; e: number }[]>;
const blocos = segs.flatMap((s) => {
  const partes = s.legenda.split("|").map((p) => p.trim());
  const ws = PALAVRAS[s.id] ?? [];
  const contagem = partes.map((p) => p.replace(/\*/g, "").split(/\s+/).filter(Boolean).length);
  const totalL = contagem.reduce((a, b) => a + b, 0);
  let acum = 0;
  const inicios = partes.map((_, i) => {
    const idx = ws.length ? Math.min(ws.length - 1, Math.round((acum * ws.length) / totalL)) : 0;
    const t = ws.length ? s.ini + Math.round(ws[idx].s * FPS) : s.ini + Math.round((acum / totalL) * s.len);
    acum += contagem[i];
    return i === 0 ? s.ini : t;
  });
  return partes.map((texto, i) => ({ texto, ini: inicios[i], fim: i + 1 < partes.length ? inicios[i + 1] : s.ini + s.len + GAP }));
});

/** Frame (relativo ao início da fala) em que uma palavra é dita; se não achar, usa a fração da fala */
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const momento = (id: string, palavra: string, frac: number) => {
  const s = seg(id);
  const w = (PALAVRAS[id] ?? []).find((p) => norm(p.w).startsWith(norm(palavra)));
  return w ? Math.round(w.s * FPS) : Math.round(s.len * frac);
};

/** Cena: aparece com fade e um leve zoom contínuo */
const Cena: React.FC<{ children: React.ReactNode; len: number; zoom?: number }> = ({ children, len, zoom = 0.06 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const z = 1 + zoom * (f / len);
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${z})`, transformOrigin: "50% 70%" }}>{children}</AbsoluteFill>;
};

const Centro: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 640 }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>{children}</div>
);

// ───────────────────────── cenas ─────────────────────────

const Gancho: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const giro = f < 36 ? Math.cos(f * 0.35) : 1;
  const flash = interpolate(f, [34, 38, 52], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const carimbo = useSpring(momento("gancho", "roubaram", 0.42), 260, 12);
  return (
    <Cena len={len}>
      <Titulo linhas={[{ t: "Roubaram a" }, { t: "Copa do Mundo.", cor: OURO }, { t: "De dentro da CBF.", caixa: true, at: momento("gancho", "dentro", 0.55) - 3 }]} size={120} />
      <Centro top={700}>
        <div style={{ transform: `scaleX(${giro})` }}><Taca size={430} brilho={1.2} /></div>
      </Centro>
      <div style={{ position: "absolute", left: 540, top: 1060, transform: `translate(-50%,-50%) rotate(-10deg) scale(${2 - carimbo})`, opacity: carimbo,
        border: `8px solid ${VERMELHO}`, color: VERMELHO, fontFamily: ANTON, fontSize: 120, padding: "0 30px", letterSpacing: 6, background: "rgba(10,10,14,0.55)" }}>
        ROUBADA
      </div>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </Cena>
  );
};

const Tri: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const meio = Math.round(len * 0.5);
  const sobe = lerp(f, meio, meio + 20);
  return (
    <Cena len={len}>
      <Centro top={300}>
        <div style={{ display: "flex", gap: 40 }}>
          {[0, 1, 2].map((i) => {
            const s = useSpring(6 + i * 7, 240, 11);
            return <span key={i} style={{ fontSize: 110, color: OURO, transform: `scale(${s})`, display: "inline-block", filter: "drop-shadow(0 0 20px rgba(245,197,24,0.6))" }}>★</span>;
          })}
        </div>
      </Centro>
      <Centro top={420}>
        <div style={{ fontFamily: ANTON, fontSize: 300, color: "white", lineHeight: 1, opacity: lerp(f, 0, 10) }}>1970</div>
      </Centro>
      <Centro top={740}>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 46, letterSpacing: 8, color: OURO, opacity: lerp(f, 12, 22) }}>MÉXICO · TRICAMPEÃO</div>
      </Centro>
      <Centro top={880 + (1 - sobe) * 400}>
        <div style={{ opacity: sobe }}><Taca size={300} brilho={1.4} /></div>
      </Centro>
      <Tag x={540} y={1330} at={momento("tri", "sempre", 0.78)} texto="FICA COM O BRASIL. PRA SEMPRE." size={42} />
    </Cena>
  );
};

const Predio: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const chuva = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 157) % 1080;
    const y = ((i * 263 + f * 38) % 2100) - 100;
    return <div key={i} style={{ position: "absolute", left: x, top: y, width: 2, height: 60, background: "rgba(180,200,255,0.25)", transform: "rotate(12deg)" }} />;
  });
  const acesas = new Set([3, 8, 11, 17, 22, 26, 31, 37, 40, 44]);
  return (
    <Cena len={len} zoom={0.05}>
      <Titulo linhas={[{ t: "Exposta na" }, { t: "sede da CBF", cor: OURO }]} size={120} />
      <Centro top={600}>
        <div style={{ position: "relative", width: 640, height: 760, background: "linear-gradient(180deg,#1c1c26,#101016)", border: "2px solid #2a2a36",
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 22, padding: 40, boxSizing: "border-box" }}>
          {Array.from({ length: 48 }, (_, i) => (
            <div key={i} style={{ background: acesas.has(i) ? "rgba(255,200,90,0.75)" : "rgba(255,255,255,0.05)",
              boxShadow: acesas.has(i) ? "0 0 16px rgba(255,200,90,0.5)" : "none" }} />
          ))}
        </div>
      </Centro>
      <Tag x={540} y={1300} at={14} texto="RUA DA ALFÂNDEGA · RIO" size={38} cor="#ffffff" />
      {chuva}
    </Cena>
  );
};

const Detalhe: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const tMadeira = momento("detalhe", "madeira", 0.62);
  const alerta = f > tMadeira ? 0.55 + 0.45 * Math.sin((f - tMadeira) * 0.35) : 0;
  return (
    <Cena len={len} zoom={0.04}>
      <Titulo linhas={[{ t: "Só tinha" }, { t: "um detalhe.", caixa: true, at: 6 }]} size={120} />
      <Centro top={590}><Vitrine brilhoVidro={lerp(f, 10, 50)} alertaMadeira={alerta} /></Centro>
      <Tag x={540} y={810} at={momento("detalhe", "blindado", 0.3)} texto="✓ VIDRO BLINDADO" cor={VERDE} corTexto="white" />
      <Tag x={540} y={1325} at={tMadeira} texto="✕ MOLDURA DE MADEIRA" cor={VERMELHO} corTexto="white" size={44} />
    </Cena>
  );
};

const Vulto: React.FC<{ x: number; escala?: number; cor?: string; bone?: boolean }> = ({ x, escala = 1, cor = "#000", bone }) => (
  <div style={{ position: "absolute", left: x, top: 0, transform: `scale(${escala})`, transformOrigin: "bottom center", filter: "drop-shadow(0 0 3px rgba(150,170,255,0.9)) drop-shadow(0 0 18px rgba(120,150,255,0.45))" }}>
    <svg width="200" height="460" viewBox="0 0 200 460">
      <circle cx="100" cy="70" r="46" fill={cor} />
      {bone && <path d="M50,58 Q100,10 150,58 L168,66 L50,66 Z" fill={cor} />}
      <path d="M40,140 Q100,110 160,140 L176,320 L144,320 L140,460 L108,460 L100,330 L92,460 L60,460 L56,320 L24,320 Z" fill={cor} />
    </svg>
  </div>
);

const Noite: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const entra = lerp(f, 4, 40);
  const tRendido = momento("noite", "renderam", 0.48);
  const rendido = lerp(f, tRendido, tRendido + 10);
  return (
    <Cena len={len} zoom={0.05}>
      <Fundo luz="rgba(120,140,255,0.10)" />
      <Titulo linhas={[{ t: "19 de dezembro" }, { t: "de 1983 · noite", cor: OURO }]} size={112} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 650, height: 470 }}>
        {/* lanterna */}
        <div style={{ position: "absolute", left: 200 + entra * 120, top: 120, width: 700, height: 260,
          background: "radial-gradient(ellipse at left, rgba(255,240,180,0.35), transparent 70%)", clipPath: "polygon(0 45%, 100% 0, 100% 100%, 0 55%)" }} />
        <Vulto x={-260 + entra * 330} />
        <Vulto x={-420 + entra * 400} escala={0.95} />
        <div style={{ opacity: 1 - rendido * 0.5 }}><Vulto x={780} cor="#2a3550" bone escala={0.95} /></div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 460, height: 4, background: "rgba(255,255,255,0.15)" }} />
      </div>
      <Tag x={880} y={600} at={momento("noite", "vigia", 0.6) - 8} texto="ÚNICO VIGIA" cor="#ffffff" size={34} />
      <Tag x={880} y={880} at={tRendido} texto="RENDIDO" cor={VERMELHO} corTexto="white" size={40} rot={-8} />
      <Tag x={540} y={1300} at={momento("noite", "sala", 0.85)} texto="→ SALA DE TROFÉUS" size={44} />
    </Cena>
  );
};

const Moldura: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const t = momento("moldura", "arrancaram", 0.42);
  return (
    <Cena len={len} zoom={0.03}>
      <Titulo linhas={[{ t: "Não quebraram o vidro." }, { t: "Arrancaram a moldura.", caixa: true, at: t }]} size={86} />
      <Centro top={660}><Vitrine soltar={lerp(f, t, t + 30)} semTaca={lerp(f, t + 18, t + 34)} /></Centro>
      <Tag x={860} y={1250} at={t + 26} texto="VIDRO INTACTO" cor={VERDE} corTexto="white" size={34} />
    </Cena>
  );
};

const Cofre: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const abre = lerp(f, 12, 34);
  const tOriginal = momento("cofre", "original", 0.58);
  return (
    <Cena len={len} zoom={0.03}>
      <Titulo linhas={[{ t: "O mais" }, { t: "absurdo:", caixa: true, at: 4 }]} size={120} />
      {/* cofre */}
      <div style={{ position: "absolute", left: 650, top: 660, width: 380, height: 520 }}>
        <div style={{ position: "absolute", inset: 0, background: "#151820", border: "6px solid #5a6170", borderRadius: 18 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 50, display: "flex", justifyContent: "center", opacity: abre }}>
          <Taca size={240} brilho={1.3} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#8a919e,#4b515c)", border: "6px solid #5a6170", borderRadius: 18,
          transformOrigin: "left center", transform: `perspective(1200px) rotateY(${-100 * abre}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 150, height: 150, borderRadius: 75, border: "10px solid #2b2f37", background: "#6b7280",
            transform: `rotate(${f * 12}deg)`, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 10, height: 50, background: "#2b2f37", marginTop: 6 }} />
          </div>
        </div>
      </div>
      <Tag x={840} y={1250} at={momento("cofre", "replica", 0.3)} texto="🔒 RÉPLICA" size={44} />
      {/* parede */}
      <div style={{ position: "absolute", left: 40, top: 660, width: 380, height: 520, border: "4px dashed rgba(255,255,255,0.35)", opacity: lerp(f, tOriginal - 6, tOriginal + 6),
        display: "flex", justifyContent: "center", paddingTop: 40, boxSizing: "border-box" }}>
        <Taca size={240} brilho={1} />
      </div>
      <Tag x={230} y={1250} at={tOriginal} texto="A ORIGINAL" cor={VERMELHO} corTexto="white" size={40} />
    </Cena>
  );
};

const Fim: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const p2 = useSpring(len + 2, 200, 13);
  const sai = lerp(f, len - 4, len + 4);
  return (
    <AbsoluteFill>
      <div style={{ opacity: 1 - sai }}>
        <Titulo linhas={[{ t: "E essa nem era" }, { t: "a primeira vez.", cor: OURO, at: 10 }]} top={700} size={120} />
      </div>
      <Centro top={640}>
        <div style={{ textAlign: "center", opacity: p2, transform: `scale(${0.7 + 0.3 * p2})` }}>
          <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 44, letterSpacing: 10, color: "white" }}>AMANHÃ</div>
          <div style={{ fontFamily: ANTON, fontSize: 260, color: "#0A0A0E", background: OURO, padding: "0 40px", lineHeight: 1.1, marginTop: 10 }}>PARTE 2</div>
          <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 42, color: "white", marginTop: 40 }}>Segue pra não perder.</div>
        </div>
      </Centro>
    </AbsoluteFill>
  );
};

const CENAS: Record<string, React.FC<{ len: number }>> = {
  gancho: Gancho, tri: Tri, predio: Predio, detalhe: Detalhe, noite: Noite, moldura: Moldura, cofre: Cofre, fim: Fim,
};

/** Efeitos sonoros: [arquivo, frame absoluto, volume] */
const g = (id: string, palavra: string, frac: number) => seg(id).ini + momento(id, palavra, frac);
const tParte2 = seg("fim").ini + seg("fim").len + 2;
const EFEITOS: [string, number, number][] = [
  ["impacto", g("gancho", "roubaram", 0.42), 0.8],
  ["impacto", g("detalhe", "madeira", 0.62), 0.55],
  ["impacto", g("noite", "renderam", 0.48), 0.45],
  ["subida", g("moldura", "arrancaram", 0.42) - 54, 0.5],
  ["impacto", g("moldura", "arrancaram", 0.42), 0.9],
  ["impacto", g("cofre", "original", 0.58), 0.7],
  ["subida", tParte2 - 54, 0.55],
  ["impacto", tParte2, 1],
  ...segs.slice(1).map((s) => ["whoosh", s.ini - 4, 0.2] as [string, number, number]),
];
const FIM_CORACAO = seg("fim").ini;

export const Parte1: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0A0A0E" }}>
      <Fundo />
      {segs.map((s, i) => {
        const C = CENAS[s.id];
        const proximo = segs[i + 1];
        const dur = (proximo ? proximo.ini : totalFrames) - s.ini;
        return (
          <Sequence key={s.id} from={s.ini} durationInFrames={dur}>
            <C len={s.len} />
          </Sequence>
        );
      })}
      <Selo serie={roteiro.serie} parte={roteiro.parte} />
      <Legenda blocos={blocos} />
      <Sequence from={INICIO}>
        <Audio src={staticFile("audio/narracao.wav")} />
      </Sequence>
      <Audio src={staticFile("audio/ar.wav")} volume={(fr) => interpolate(fr, [0, 15, totalFrames - 30, totalFrames], [0, 0.35, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      <Sequence from={0} durationInFrames={FIM_CORACAO}>
        <Audio src={staticFile("audio/coracao.wav")} loop volume={(fr) => interpolate(fr, [0, 10, FIM_CORACAO - 20, FIM_CORACAO], [0, 0.55, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      {EFEITOS.map(([arq, fr, vol], i) => (
        <Sequence key={"fx" + i} from={Math.max(0, fr)} durationInFrames={60}>
          <Audio src={staticFile(`audio/${arq}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
