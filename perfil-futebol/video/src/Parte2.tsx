import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import roteiro from "./data/parte2/roteiro.json";
import duracoes from "./data/parte2/duracoes.json";
import palavras from "./data/parte2/palavras.json";
import inicios from "./data/parte2/inicios.json";
import { ANTON, Fundo, INTER, Legenda, lerp, OURO, Selo, Taca, Tag, Titulo, useSpring, VERDE, VERMELHO, Vitrine } from "./ui";

const FPS = 30;
const GAP = 0;
const INICIO = 8;
const CAUDA = 75; // tela final "Parte 3"

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
export const totalFrames2 = ultimo.ini + ultimo.len + CAUDA;
const seg = (id: string) => segs.find((s) => s.id === id)!;

const PALAVRAS = palavras as Record<string, { w: string; s: number; e: number }[]>;
const blocos = segs.flatMap((s) => {
  const partes = s.legenda.split("|").map((p) => p.trim());
  const ws = PALAVRAS[s.id] ?? [];
  const contagem = partes.map((p) => p.replace(/\*/g, "").split(/\s+/).filter(Boolean).length);
  const totalL = contagem.reduce((a, b) => a + b, 0);
  let acum = 0;
  const ini = partes.map((_, i) => {
    const idx = ws.length ? Math.min(ws.length - 1, Math.round((acum * ws.length) / totalL)) : 0;
    const t = ws.length ? s.ini + Math.round(ws[idx].s * FPS) : s.ini + Math.round((acum / totalL) * s.len);
    acum += contagem[i];
    return i === 0 ? s.ini : t;
  });
  return partes.map((texto, i) => ({ texto, ini: ini[i], fim: i + 1 < partes.length ? ini[i + 1] : s.ini + s.len + GAP }));
});

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const momento = (id: string, palavra: string, frac: number) => {
  const s = seg(id);
  const w = (PALAVRAS[id] ?? []).find((p) => norm(p.w).startsWith(norm(palavra)));
  return w ? Math.round(w.s * FPS) : Math.round(s.len * frac);
};

const Cena: React.FC<{ children: React.ReactNode; len: number; zoom?: number }> = ({ children, len, zoom = 0.06 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const z = 1 + zoom * (f / len);
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${z})`, transformOrigin: "50% 70%" }}>{children}</AbsoluteFill>;
};

const Centro: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 640 }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>{children}</div>
);

// ───────────────────────── peças ─────────────────────────

/** Caixa de sapato vista de frente; "tampa" de 0 (aberta, taça à mostra) a 1 (fechada) */
const CaixaSapato: React.FC<{ tampa?: number; largura?: number }> = ({ tampa = 0, largura = 520 }) => {
  const h = largura * 0.42;
  return (
    <div style={{ position: "relative", width: largura, height: h + 260 }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: h - 40, display: "flex", justifyContent: "center", opacity: 1 - tampa }}>
        <Taca size={300} brilho={1.2} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "linear-gradient(180deg,#a8794a,#7a5532)",
        border: "4px solid #4e3520", borderRadius: 6, boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "absolute", left: "50%", top: "38%", transform: "translateX(-50%)", fontFamily: INTER, fontWeight: 900,
          fontSize: largura * 0.07, color: "rgba(40,25,10,0.55)", letterSpacing: 4 }}>SCARPE</div>
      </div>
      <div style={{ position: "absolute", left: -14, right: -14, height: 46, bottom: h - 6 + (1 - tampa) * 300, opacity: tampa > 0.02 ? 1 : 0,
        background: "linear-gradient(180deg,#b88a58,#8d6440)", border: "4px solid #4e3520", borderRadius: 6, transform: `rotate(${(1 - tampa) * -12}deg)` }} />
    </div>
  );
};

/** Cama vista de lado (silhueta) */
const Cama: React.FC = () => (
  <svg width="900" height="360" viewBox="0 0 900 360">
    <rect x="40" y="60" width="40" height="300" fill="#2a2f3d" />
    <rect x="820" y="140" width="40" height="220" fill="#2a2f3d" />
    <rect x="60" y="170" width="780" height="70" rx="8" fill="#3a4255" />
    <rect x="70" y="130" width="760" height="50" rx="14" fill="#c9cdd8" />
    <rect x="90" y="110" width="170" height="40" rx="18" fill="#e8eaf0" />
  </svg>
);

const Cachorro: React.FC<{ fareja?: number; cor?: string }> = ({ fareja = 0, cor = "#1a1a1a" }) => {
  const cab = Math.sin(fareja) * 6;
  return (
    <svg width="420" height="300" viewBox="0 0 420 300" style={{ filter: "drop-shadow(0 0 3px rgba(245,197,24,0.8)) drop-shadow(0 0 16px rgba(245,197,24,0.35))" }}>
      <path d="M90,130 Q60,100 40,70 Q55,95 70,120 Z" fill={cor} />
      <ellipse cx="180" cy="150" rx="120" ry="58" fill={cor} />
      <rect x="95" y="180" width="26" height="100" rx="10" fill={cor} />
      <rect x="140" y="185" width="26" height="95" rx="10" fill={cor} />
      <rect x="215" y="185" width="26" height="95" rx="10" fill={cor} />
      <rect x="255" y="180" width="26" height="100" rx="10" fill={cor} />
      <g transform={`translate(0 ${cab})`}>
        <path d="M270,120 Q300,95 340,120 L395,165 Q400,185 380,190 L330,182 Q290,175 275,150 Z" fill={cor} />
        <path d="M300,108 Q285,80 300,62 Q318,90 320,112 Z" fill={cor} />
        <circle cx="388" cy="180" r="9" fill="#000" />
      </g>
    </svg>
  );
};

const Arbusto: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `scale(${s})`, transformOrigin: "bottom left" }}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{ position: "absolute", left: i * 90, top: (i % 2) * 30, width: 170, height: 170, borderRadius: 90,
        background: "radial-gradient(circle at 40% 35%,#2f6b3a,#14301b)" }} />
    ))}
  </div>
);

// ───────────────────────── cenas ─────────────────────────

const Gancho: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const tGuerra = momento("gancho", "guerra", 0.55);
  const tRoubo = momento("gancho", "roubo", 0.85);
  return (
    <Cena len={len}>
      <Titulo linhas={[{ t: "Essa taça já tinha" }, { t: "sumido antes.", caixa: true, at: 6 }]} size={112} />
      <Centro top={680}><CaixaSapato tampa={lerp(f, 0, 20, 1, 0)} /></Centro>
      <Tag x={300} y={1330} at={tGuerra} texto="UMA GUERRA" cor="#ffffff" size={44} rot={-4} />
      <Tag x={780} y={1330} at={tRoubo} texto="OUTRO ROUBO" cor={VERMELHO} corTexto="white" size={44} rot={4} />
    </Cena>
  );
};

const Guerra: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const tCaixa = momento("guerra", "caixa", 0.62);
  const tCama = momento("guerra", "cama", 0.9);
  const desliza = lerp(f, tCama - 6, tCama + 14);
  return (
    <Cena len={len} zoom={0.04}>
      <Fundo luz="rgba(255,190,110,0.10)" />
      <Titulo linhas={[{ t: "Itália" }, { t: "Segunda Guerra", cor: OURO }]} size={112} />
      <Tag x={540} y={600} at={momento("guerra", "ottorino", 0.35)} texto="OTTORINO BARASSI · DIRIGENTE" cor="#ffffff" size={36} />
      <Tag x={540} y={680} at={momento("guerra", "roma", 0.5)} texto="BANCO EM ROMA → CASA DELE" size={36} />
      <div style={{ position: "absolute", left: 90, top: 860 }}><Cama /></div>
      <div style={{ position: "absolute", left: 640 - desliza * 330, top: 1040 - desliza * -40, transform: `scale(${0.5})`, transformOrigin: "top left",
        opacity: lerp(f, tCaixa - 4, tCaixa + 6) * (1 - lerp(f, tCama + 10, tCama + 18) * 0.65) }}>
        <CaixaSapato tampa={1} largura={420} />
      </div>
      <Tag x={540} y={1330} at={tCama} texto="EMBAIXO DA CAMA" cor={VERMELHO} corTexto="white" size={46} rot={-3} />
    </Cena>
  );
};

const Vulto: React.FC<{ x: number; escala?: number; cor?: string; quepe?: boolean }> = ({ x, escala = 1, cor = "#000", quepe }) => (
  <div style={{ position: "absolute", left: x, top: 0, transform: `scale(${escala})`, transformOrigin: "bottom center", filter: "drop-shadow(0 0 3px rgba(150,170,255,0.9)) drop-shadow(0 0 18px rgba(120,150,255,0.45))" }}>
    <svg width="200" height="460" viewBox="0 0 200 460">
      <circle cx="100" cy="70" r="46" fill={cor} />
      {quepe && <path d="M44,58 Q100,0 156,58 L180,70 L44,70 Z" fill={cor} />}
      <path d="M40,140 Q100,110 160,140 L176,320 L144,320 L140,460 L108,460 L100,330 L92,460 L60,460 L56,320 L24,320 Z" fill={cor} />
    </svg>
  </div>
);

const Revista: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const tNinguem = momento("revista", "ninguem", 0.7);
  const varre = Math.sin(f * 0.08) * 220;
  return (
    <Cena len={len} zoom={0.05}>
      <Fundo luz="rgba(120,140,255,0.10)" />
      <Titulo linhas={[{ t: "A casa foi" }, { t: "revistada.", caixa: true, at: momento("revista", "revistada", 0.4) }]} size={120} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 640, height: 470 }}>
        <div style={{ position: "absolute", left: 330 + varre, top: 140, width: 620, height: 240,
          background: "radial-gradient(ellipse at left, rgba(255,240,180,0.32), transparent 70%)", clipPath: "polygon(0 45%, 100% 0, 100% 100%, 0 55%)" }} />
        <Vulto x={80} quepe />
        <Vulto x={250} quepe escala={0.95} />
        <div style={{ position: "absolute", left: 470, top: 250, transform: "scale(0.62)", transformOrigin: "top left", opacity: 0.85 }}><Cama /></div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 460, height: 4, background: "rgba(255,255,255,0.15)" }} />
      </div>
      <Tag x={540} y={1300} at={tNinguem} texto="NINGUÉM ACHOU" cor={VERDE} corTexto="white" size={50} />
    </Cena>
  );
};

const Londres: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const tRoubada = momento("londres", "roubada", 0.9);
  return (
    <Cena len={len} zoom={0.04}>
      <Centro top={280}>
        <div style={{ fontFamily: ANTON, fontSize: 280, color: "white", lineHeight: 1, opacity: lerp(f, 0, 10) }}>1966</div>
      </Centro>
      <Centro top={580}>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 46, letterSpacing: 8, color: OURO, opacity: lerp(f, 12, 22) }}>LONDRES · EXPOSIÇÃO</div>
      </Centro>
      <Centro top={680}>
        <div style={{ transform: "scale(0.82)", transformOrigin: "top center" }}><Vitrine semTaca={lerp(f, tRoubada - 2, tRoubada + 8)} brilhoVidro={0.6} /></div>
      </Centro>
      <Tag x={540} y={1040} at={tRoubada} texto="ROUBADA" cor={VERMELHO} corTexto="white" size={70} rot={-6} />
    </Cena>
  );
};

const Pickles: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const tJornal = momento("pickles", "jornal", 0.6);
  const tTaca = momento("pickles", "taca", 0.92);
  const anda = lerp(f, 0, tJornal);
  const revela = lerp(f, tTaca - 2, tTaca + 12);
  return (
    <Cena len={len} zoom={0.04}>
      <Titulo linhas={[{ t: "Uma semana depois:" }, { t: "Pickles.", cor: OURO, at: momento("pickles", "pickles", 0.2) }]} size={112} />
      <Arbusto x={430} y={760} s={1.25} />
      {/* pacote de jornal embaixo da cerca */}
      <div style={{ position: "absolute", left: 600, top: 1040, width: 220, height: 130, borderRadius: 10, opacity: 1 - revela,
        background: "repeating-linear-gradient(0deg,#d9d4c7 0 10px,#b9b3a5 10px 12px)", border: "3px solid #8f897b",
        boxShadow: f > tJornal ? `0 0 ${20 + 14 * Math.sin(f * 0.4)}px rgba(245,197,24,0.8)` : "none" }} />
      <div style={{ position: "absolute", left: 560, top: 870, opacity: revela, transform: `scale(${0.8 + 0.2 * revela})` }}>
        <Taca size={300} brilho={1.5} />
      </div>
      <div style={{ position: "absolute", left: -380 + anda * 520, top: 920 }}><Cachorro fareja={f * 0.6} /></div>
      <Tag x={540} y={1330} at={tTaca} texto="ERA A TAÇA" cor={OURO} size={56} />
    </Cena>
  );
};

const Heroi: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const flashes = [6, 13, 19, 27, 34, 41].map((t, i) => {
    const o = interpolate(f, [t, t + 2, t + 8], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const x = [180, 860, 320, 760, 120, 940][i];
    const y = [700, 760, 1180, 1120, 980, 1000][i];
    return <div key={i} style={{ position: "absolute", left: x - 90, top: y - 90, width: 180, height: 180, borderRadius: 90, opacity: o,
      background: "radial-gradient(circle,rgba(255,255,255,1),rgba(255,255,255,0) 70%)" }} />;
  });
  const medalha = useSpring(momento("heroi", "heroi", 0.5), 220, 12);
  return (
    <Cena len={len} zoom={0.05}>
      <Titulo linhas={[{ t: "Herói" }, { t: "nacional.", caixa: true, at: momento("heroi", "heroi", 0.5) }]} size={130} />
      <Centro top={820}><Cachorro cor="#151515" /></Centro>
      {/* fita e medalha no peito */}
      <div style={{ position: "absolute", left: 572, top: 950, width: 0, height: 0, borderLeft: "22px solid transparent", borderRight: "22px solid transparent",
        borderTop: `46px solid ${VERMELHO}`, opacity: medalha }} />
      <div style={{ position: "absolute", left: 566, top: 985, width: 56, height: 56, borderRadius: 28, background: `radial-gradient(circle at 35% 35%,#fff3b0,${OURO})`,
        border: "4px solid #b8860b", transform: `scale(${medalha})`, boxShadow: "0 0 30px rgba(245,197,24,0.8)" }} />
      {flashes}
    </Cena>
  );
};

const Fim: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const p3 = useSpring(len + 2, 200, 13);
  const sai = lerp(f, len - 4, len + 4);
  const tPlano = momento("fim", "plano", 0.45);
  const tFutebol = momento("fim", "futebol", 0.85);
  return (
    <AbsoluteFill>
      <div style={{ opacity: 1 - sai }}>
        <Titulo linhas={[{ t: "1983: sem cachorro." }, { t: "Teve um plano.", cor: OURO, at: tPlano }, { t: "De dentro do futebol.", caixa: true, at: tFutebol }]} top={600} size={100} />
      </div>
      <Centro top={640}>
        <div style={{ textAlign: "center", opacity: p3, transform: `scale(${0.7 + 0.3 * p3})` }}>
          <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 44, letterSpacing: 10, color: "white" }}>AMANHÃ</div>
          <div style={{ fontFamily: ANTON, fontSize: 260, color: "#0A0A0E", background: OURO, padding: "0 40px", lineHeight: 1.1, marginTop: 10 }}>PARTE 3</div>
          <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 42, color: "white", marginTop: 40 }}>Quem planejou o roubo.</div>
        </div>
      </Centro>
    </AbsoluteFill>
  );
};

const CENAS: Record<string, React.FC<{ len: number }>> = {
  gancho: Gancho, guerra: Guerra, revista: Revista, londres: Londres, pickles: Pickles, heroi: Heroi, fim: Fim,
};

const g = (id: string, palavra: string, frac: number) => seg(id).ini + momento(id, palavra, frac);
const tParte3 = seg("fim").ini + seg("fim").len + 2;
const EFEITOS: [string, number, number][] = [
  ["impacto", g("gancho", "roubo", 0.85), 0.7],
  ["impacto", g("guerra", "cama", 0.9), 0.55],
  ["impacto", g("revista", "ninguem", 0.7), 0.5],
  ["subida", g("londres", "roubada", 0.9) - 54, 0.5],
  ["impacto", g("londres", "roubada", 0.9), 0.9],
  ["subida", g("pickles", "taca", 0.92) - 54, 0.5],
  ["impacto", g("pickles", "taca", 0.92), 0.9],
  ["impacto", g("fim", "futebol", 0.85), 0.6],
  ["subida", tParte3 - 54, 0.55],
  ["impacto", tParte3, 1],
  ...segs.slice(1).map((s) => ["whoosh", s.ini - 4, 0.2] as [string, number, number]),
];
const FIM_CORACAO = seg("fim").ini;

export const Parte2: React.FC = () => (
  <AbsoluteFill style={{ background: "#0A0A0E" }}>
    <Fundo />
    {segs.map((s, i) => {
      const C = CENAS[s.id];
      const proximo = segs[i + 1];
      const dur = (proximo ? proximo.ini : totalFrames2) - s.ini;
      return (
        <Sequence key={s.id} from={s.ini} durationInFrames={dur}>
          <C len={s.len} />
        </Sequence>
      );
    })}
    <Selo serie={roteiro.serie} parte={roteiro.parte} />
    <Legenda blocos={blocos} />
    <Sequence from={INICIO}>
      <Audio src={staticFile("audio/narracao-parte2.wav")} />
    </Sequence>
    <Audio src={staticFile("audio/ar.wav")} volume={(fr) => interpolate(fr, [0, 15, totalFrames2 - 30, totalFrames2], [0, 0.35, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
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
