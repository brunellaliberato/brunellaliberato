import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import roteiro from "./data/quente01/roteiro.json";
import duracoes from "./data/quente01/duracoes.json";
import palavras from "./data/quente01/palavras.json";
import inicios from "./data/quente01/inicios.json";
import { ANTON, Fundo, INTER, Legenda, lerp, OURO, Selo, Tag, Titulo, useSpring, VERMELHO } from "./ui";

// Pauta quente 01: Corinthians e Grêmio empatados na zona (Brasileirão 2026, após a 34ª rodada).
// Sem escudos oficiais: cada time aparece como um escudo genérico nas cores do clube.

const FPS = 30;
const INICIO = 8;
const CAUDA = 60;

type Seg = { id: string; fala: string; legenda: string; ini: number; len: number };
const INI = inicios as Record<string, number>;
const DUR = duracoes as Record<string, number>;
const segs: Seg[] = roteiro.segmentos.map((s) => {
  const ini = INICIO + Math.round(INI[s.id] * FPS);
  const fim = INICIO + Math.round((INI[s.id] + DUR[s.id]) * FPS);
  return { ...s, ini, len: fim - ini };
});
const ultimo = segs[segs.length - 1];
export const totalFramesQ1 = ultimo.ini + ultimo.len + CAUDA;
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
  return partes.map((texto, i) => ({ texto, ini: ini[i], fim: i + 1 < partes.length ? ini[i + 1] : s.ini + s.len }));
});

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
/** frame (relativo ao trecho) em que a palavra é dita; `n` = qual ocorrência */
const momento = (id: string, palavra: string, frac: number, n = 0) => {
  const s = seg(id);
  const ws = (PALAVRAS[id] ?? []).filter((p) => norm(p.w).startsWith(norm(palavra)));
  const w = ws[n] ?? ws[0];
  return w ? Math.round(w.s * FPS) : Math.round(s.len * frac);
};

const Cena: React.FC<{ children: React.ReactNode; len: number; zoom?: number }> = ({ children, len, zoom = 0.05 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${1 + zoom * (f / len)})`, transformOrigin: "50% 60%" }}>{children}</AbsoluteFill>;
};

// ───────────────────────── peças ─────────────────────────

type Time = { sigla: string; nome: string; cores: string[]; texto: string };
const COR: Time = { sigla: "COR", nome: "Corinthians", cores: ["#111111", "#FFFFFF"], texto: "#FFFFFF" };
const GRE: Time = { sigla: "GRE", nome: "Grêmio", cores: ["#0D80BF", "#111111", "#FFFFFF"], texto: "#FFFFFF" };
const INT: Time = { sigla: "INT", nome: "Internacional", cores: ["#D7141A", "#FFFFFF"], texto: "#FFFFFF" };
const VIT: Time = { sigla: "VIT", nome: "Vitória", cores: ["#D7141A", "#111111"], texto: "#FFFFFF" };

/** Escudo genérico com listras nas cores do time (não é o escudo oficial) */
const Escudo: React.FC<{ t: Time; size?: number; at?: number }> = ({ t, size = 300, at = 0 }) => {
  const s = useSpring(at, 180, 14);
  const n = t.cores.length;
  const id = `esc-${t.sigla}-${size}`;
  return (
    <div style={{ transform: `scale(${s}) translateY(${(1 - s) * 60}px)`, opacity: s, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 100 115">
        <defs>
          <clipPath id={id}><path d="M50,3 L95,15 L92,62 C88,88 70,103 50,112 C30,103 12,88 8,62 L5,15 Z" /></clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={i * 10} y={0} width={10} height={115} fill={t.cores[i % n]} />
          ))}
          <rect x="0" y="34" width="100" height="36" fill="rgba(0,0,0,0.72)" />
        </g>
        <path d="M50,3 L95,15 L92,62 C88,88 70,103 50,112 C30,103 12,88 8,62 L5,15 Z" fill="none" stroke={OURO} strokeWidth="3" />
        <text x="50" y="62" textAnchor="middle" fontFamily={ANTON} fontSize="28" fill={t.texto} letterSpacing="1">{t.sigla}</text>
      </svg>
      <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: size * 0.17, color: "white", textTransform: "uppercase", letterSpacing: 2 }}>{t.nome}</div>
    </div>
  );
};

const Carimbo: React.FC<{ at: number; texto: string; top: number; cor?: string; size?: number; rot?: number }> = ({ at, texto, top, cor = VERMELHO, size = 88, rot = -6 }) => {
  const f = useCurrentFrame();
  const s = useSpring(at, 320, 12);
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${2.2 - 1.2 * s}) rotate(${rot}deg)`, opacity: Math.min(1, s * 1.5), background: cor, color: "white",
        fontFamily: ANTON, fontSize: size, padding: "8px 34px 14px", letterSpacing: 2, textTransform: "uppercase", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        {texto}
      </div>
    </div>
  );
};

type Linha = { pos: number; t: Time; pts: number; sg: string };
const TABELA: Linha[] = [
  { pos: 15, t: VIT, pts: 38, sg: "−16" },
  { pos: 16, t: INT, pts: 38, sg: "−4" },
  { pos: 17, t: COR, pts: 37, sg: "−6" },
  { pos: 18, t: GRE, pts: 37, sg: "−9" },
];

/** Recorte da tabela, 15º ao 18º. `brilhoSG` acende a coluna do saldo; `foco` = "zona" | "acima" */
const Tabela: React.FC<{ brilhoSG?: number; foco: "zona" | "acima"; top?: number }> = ({ brilhoSG = 0, foco, top = 470 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60 }}>
      <div style={{ display: "flex", fontFamily: INTER, fontWeight: 800, fontSize: 30, color: "rgba(255,255,255,0.55)", padding: "0 28px 14px", letterSpacing: 2 }}>
        <div style={{ width: 90 }}>#</div><div style={{ flex: 1 }}>TIME</div><div style={{ width: 130, textAlign: "right" }}>PTS</div>
        <div style={{ width: 150, textAlign: "right", color: brilhoSG > 0 ? OURO : undefined }}>SALDO</div>
      </div>
      {TABELA.map((l, i) => {
        const s = lerp(f, 4 + i * 4, 16 + i * 4);
        const zona = l.pos >= 17;
        const destaque = foco === "zona" ? zona : !zona;
        return (
          <React.Fragment key={l.pos}>
            {l.pos === 17 && (
              <div style={{ height: 6, background: VERMELHO, margin: "10px 0", borderRadius: 3, opacity: s, boxShadow: `0 0 20px ${VERMELHO}` }} />
            )}
            <div style={{ display: "flex", alignItems: "center", height: 118, padding: "0 28px", marginBottom: 12, borderRadius: 16,
              background: destaque ? (zona ? "rgba(229,57,53,0.22)" : "rgba(245,197,24,0.16)") : "rgba(255,255,255,0.05)",
              border: `3px solid ${destaque ? (zona ? VERMELHO : OURO) : "transparent"}`,
              opacity: s * (destaque ? 1 : 0.55), transform: `translateX(${(1 - s) * -80}px)`,
              fontFamily: INTER, fontWeight: 900, fontSize: 50, color: "white" }}>
              <div style={{ width: 90, color: zona ? VERMELHO : "rgba(255,255,255,0.7)" }}>{l.pos}º</div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 22 }}>
                <div style={{ width: 24, height: 60, borderRadius: 6, background: `linear-gradient(90deg, ${l.t.cores.join(", ")})` }} />
                {l.t.nome}
              </div>
              <div style={{ width: 130, textAlign: "right", fontFamily: ANTON, fontSize: 64, fontWeight: 400, color: destaque ? OURO : "white" }}>{l.pts}</div>
              <div style={{ width: 150, textAlign: "right", fontSize: 44, color: brilhoSG > 0 && zona ? OURO : "rgba(255,255,255,0.75)",
                transform: `scale(${zona ? 1 + 0.18 * brilhoSG : 1})`, transformOrigin: "right center" }}>{l.sg}</div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Barra: React.FC<{ t: Time; pct: number; at: number; top: number }> = ({ t, pct, at, top }) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 28);
  return (
    <div style={{ position: "absolute", top, left: 80, right: 80, opacity: lerp(f, at - 4, at + 4) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: INTER, fontWeight: 900, fontSize: 48, color: "white", marginBottom: 14 }}>
        <span style={{ textTransform: "uppercase", letterSpacing: 2 }}>{t.nome}</span>
        <span style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 110, color: VERMELHO, lineHeight: 1 }}>{Math.round(pct * p)}%</span>
      </div>
      <div style={{ height: 54, borderRadius: 27, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "2px solid rgba(255,255,255,0.15)" }}>
        <div style={{ width: `${pct * p}%`, height: "100%", background: `linear-gradient(90deg, #8E1B18, ${VERMELHO})`, boxShadow: `0 0 30px ${VERMELHO}` }} />
      </div>
    </div>
  );
};

// ───────────────────────── cenas ─────────────────────────

const Gancho: React.FC<{ len: number }> = ({ len }) => {
  const zona = momento("gancho", "zona", 0.6);
  return (
    <Cena len={len}>
      <Fundo luz="rgba(229,57,53,0.14)" />
      <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
        <Escudo t={COR} size={330} at={0} />
        <div style={{ fontFamily: ANTON, fontSize: 150, color: OURO }}>=</div>
        <Escudo t={GRE} size={330} at={momento("gancho", "gremio", 0.2)} />
      </div>
      <Carimbo at={zona} texto="Zona de rebaixamento" top={1040} />
    </Cena>
  );
};

const CenaTabela: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const saldo = momento("tabela", "saldo", 0.7);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo />
      <Titulo top={270} size={96} linhas={[{ t: "37 pontos" }, { t: "cada um", caixa: true, at: 6 }]} />
      <Tabela foco="zona" brilhoSG={lerp(f, saldo, saldo + 8)} top={560} />
    </Cena>
  );
};

const CenaAcima: React.FC<{ len: number }> = ({ len }) => {
  const um = momento("acima", "um", 0.75);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo />
      <Titulo top={270} size={96} linhas={[{ t: "logo acima:" }, { t: "1 ponto", caixa: true, at: um }]} />
      <Tabela foco="acima" top={560} />
    </Cena>
  );
};

const Historia: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const ano = momento("historia", "dois", 0.25);
  const unica = momento("historia", "unica", 0.5);
  const ultima = momento("historia", "ultima", 0.75);
  const empate = momento("historia", "empatando", 0.85);
  const sepia = lerp(f, ano - 4, ano + 6);
  return (
    <Cena len={len} zoom={0.04}>
      <Fundo luz="rgba(245,197,24,0.16)" />
      <AbsoluteFill style={{ background: "rgba(90,60,20,0.25)", opacity: sepia }} />
      {f < ano && <Titulo top={560} size={120} linhas={[{ t: "a história" }, { t: "por trás", caixa: true, at: 6 }]} />}
      {f >= ano && f < empate && (
        <>
          <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: ANTON, fontSize: 340, color: OURO,
            transform: `scale(${0.6 + 0.4 * lerp(f, ano, ano + 8)})`, textShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>2007</div>
          {f >= unica && <Tag x={540} y={880} at={unica} texto="CORINTHIANS CAI PELA ÚNICA VEZ" size={44} cor={VERMELHO} corTexto="white" rot={-3} />}
          {f >= ultima && <Tag x={540} y={1010} at={ultima} texto="NA ÚLTIMA RODADA" size={44} rot={2} />}
        </>
      )}
      {f >= empate && (
        <>
          <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
            <Escudo t={GRE} size={280} at={empate} />
            <div style={{ fontFamily: ANTON, fontSize: 130, color: OURO }}>×</div>
            <Escudo t={COR} size={280} at={empate + 3} />
          </div>
          <Carimbo at={empate + 6} texto="Empate" top={980} cor={OURO} rot={-4} />
        </>
      )}
    </Cena>
  );
};

const Risco: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const contas = momento("risco", "pelas", 0.3);
  const g = momento("risco", "gremio", 0.45);
  const c = momento("risco", "corinthians", 0.85);
  return (
    <Cena len={len} zoom={0.02}>
      <Fundo luz="rgba(229,57,53,0.12)" />
      {f < contas ? (
        <div style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 30 }}>
          <Escudo t={COR} size={260} at={0} />
          <Escudo t={GRE} size={260} at={4} />
        </div>
      ) : (
        <>
          <Titulo top={300} size={100} linhas={[{ t: "chance de" }, { t: "cair", caixa: true, at: contas + 4 }]} />
          <Barra t={GRE} pct={55} at={g} top={640} />
          <Barra t={COR} pct={44} at={c} top={900} />
          <div style={{ position: "absolute", top: 1170, left: 80, right: 80, fontFamily: INTER, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.6)",
            opacity: lerp(f, contas, contas + 10) }}>
            Simulação do site ValorFinal, atualizada em 10/11, após a 34ª rodada.
          </div>
        </>
      )}
    </Cena>
  );
};

const Fim: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const quem = momento("fim", "quem", 0.45);
  const comenta = momento("fim", "comenta", 0.8);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo />
      <Titulo top={300} size={110} linhas={[{ t: "faltam" }, { t: "4 rodadas", caixa: true, at: 6 }]} />
      {f >= quem && (
        <>
          <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
            <Escudo t={COR} size={240} at={quem} />
            <div style={{ fontFamily: ANTON, fontSize: 170, color: OURO, transform: `scale(${1 + 0.06 * Math.sin(f / 4)})` }}>?</div>
            <Escudo t={GRE} size={240} at={quem + 3} />
          </div>
        </>
      )}
      {f >= comenta && <Tag x={540} y={1230} at={comenta} texto="💬 COMENTA AÍ" size={56} rot={-2} />}
    </Cena>
  );
};

const Final: React.FC = () => {
  const s = useSpring(0, 160, 15);
  return (
    <AbsoluteFill>
      <Fundo />
      <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", opacity: s, transform: `scale(${0.9 + 0.1 * s})` }}>
        <div style={{ fontFamily: ANTON, fontSize: 120, color: "white", lineHeight: 1.05, textTransform: "uppercase" }}>Por trás<br />do lance</div>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 46, color: OURO, marginTop: 30 }}>Segue pra reta final</div>
      </div>
    </AbsoluteFill>
  );
};

const CENAS: Record<string, React.FC<{ len: number }>> = { gancho: Gancho, tabela: CenaTabela, acima: CenaAcima, historia: Historia, risco: Risco, fim: Fim };

export const Quente01: React.FC = () => {
  const sfx = (src: string, at: number, volume = 0.5) => (
    <Sequence from={at} key={`${src}-${at}`}><Audio src={staticFile(`audio/${src}.wav`)} volume={volume} /></Sequence>
  );
  const h = seg("historia");
  const g = seg("gancho");
  const r = seg("risco");
  return (
    <AbsoluteFill style={{ background: "#0A0A0E" }}>
      {segs.map((s) => {
        const C = CENAS[s.id];
        return (
          <Sequence key={s.id} from={s.id === "gancho" ? 0 : s.ini} durationInFrames={s.id === "gancho" ? s.ini + s.len : s.len}>
            <C len={s.len} />
          </Sequence>
        );
      })}
      <Sequence from={ultimo.ini + ultimo.len}><Final /></Sequence>
      <Selo serie="PAUTA QUENTE" parte="BRASILEIRÃO" />
      <Legenda blocos={blocos} />
      <Sequence from={INICIO}><Audio src={staticFile("audio/narracao-quente01.wav")} /></Sequence>
      {segs.slice(1).map((s) => sfx("whoosh", s.ini - 4, 0.35))}
      {sfx("impacto", g.ini + momento("gancho", "zona", 0.6), 0.6)}
      {sfx("impacto", h.ini + momento("historia", "dois", 0.25), 0.55)}
      {sfx("subida", r.ini + momento("risco", "gremio", 0.45), 0.35)}
    </AbsoluteFill>
  );
};
