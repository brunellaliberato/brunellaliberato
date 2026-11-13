import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import roteiro from "./data/quente02/roteiro.json";
import duracoes from "./data/quente02/duracoes.json";
import palavras from "./data/quente02/palavras.json";
import inicios from "./data/quente02/inicios.json";
import { ANTON, Fundo, INTER, Legenda, lerp, OURO, Selo, Taca, Tag, Titulo, useSpring, VERMELHO } from "./ui";
import { Carimbo, Cena, Duelo, Final, INICIO, montar, TIMES } from "./quente";

// Pauta quente 02: o caso Rojo (Estudiantes x Flamengo, semifinal da Libertadores 2026).
// Fatos conferidos em 13/11/2026: Terra (12/11 e 28/10), CNN Brasil, Lei em Campo.

const { segs, seg, blocos, momento, total, fimFala } = montar(roteiro, inicios, duracoes, palavras as never);
export const totalFramesQ2 = total;
const { FLA, EST, PAL } = TIMES;

/** Camisa vista de costas com o nome */
const Camisa: React.FC<{ at: number; size?: number }> = ({ at, size = 420 }) => {
  const s = useSpring(at, 170, 14);
  return (
    <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -8}deg)`, opacity: s }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6))" }}>
        <defs>
          <clipPath id="camisa"><path d="M60,20 L85,12 C90,22 110,22 115,12 L140,20 L185,50 L165,85 L148,75 L148,188 L52,188 L52,75 L35,85 L15,50 Z" /></clipPath>
        </defs>
        <g clipPath="url(#camisa)">
          {Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 20} y={0} width={20} height={200} fill={i % 2 ? "#FFFFFF" : "#D7141A"} />)}
          <rect x="52" y="40" width="96" height="120" fill="rgba(0,0,0,0.55)" />
        </g>
        <text x="100" y="80" textAnchor="middle" fontFamily={ANTON} fontSize="30" fill="white" letterSpacing="2">ROJO</text>
        <text x="100" y="142" textAnchor="middle" fontFamily={ANTON} fontSize="56" fill={OURO}>?</text>
      </svg>
    </div>
  );
};

/** Folhinha de calendário */
const Folha: React.FC<{ at: number; dia: string; mes: string; texto: string; cor: string; x: number; y: number }> = ({ at, dia, mes, texto, cor, x, y }) => {
  const s = useSpring(at, 200, 13);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 400, transform: `translate(-50%,0) scale(${s})`, opacity: s, borderRadius: 22, overflow: "hidden",
      background: "#F4F1EA", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", textAlign: "center" }}>
      <div style={{ background: cor, color: "white", fontFamily: INTER, fontWeight: 900, fontSize: 40, padding: "12px 0", letterSpacing: 4 }}>{mes}</div>
      <div style={{ fontFamily: ANTON, fontSize: 190, color: "#14141A", lineHeight: 1.05 }}>{dia}</div>
      <div style={{ fontFamily: INTER, fontWeight: 900, fontSize: 34, color: cor, padding: "0 16px 22px", textTransform: "uppercase" }}>{texto}</div>
    </div>
  );
};

const Placar: React.FC<{ at: number; titulo: string; a: string; b: string; ga: string; gb: string; top: number }> = ({ at, titulo, a, b, ga, gb, top }) => {
  const s = useSpring(at, 190, 15);
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s, transform: `translateY(${(1 - s) * 50}px)` }}>
      <div style={{ background: "rgba(0,0,0,0.6)", border: `3px solid ${OURO}`, borderRadius: 24, padding: "18px 40px 26px", textAlign: "center" }}>
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 32, color: OURO, letterSpacing: 4, marginBottom: 8 }}>{titulo}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 34, fontFamily: ANTON, color: "white" }}>
          <span style={{ fontSize: 70 }}>{a}</span><span style={{ fontSize: 120 }}>{ga}</span>
          <span style={{ fontSize: 70, color: OURO }}>×</span>
          <span style={{ fontSize: 120 }}>{gb}</span><span style={{ fontSize: 70 }}>{b}</span>
        </div>
      </div>
    </div>
  );
};

// ───────────────────────── cenas ─────────────────────────

const Gancho: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const zagueiro = momento("gancho", "zagueiro", 0.6);
  const muda = momento("gancho", "mudar", 0.35);
  return (
    <Cena len={len}>
      <Fundo luz="rgba(245,197,24,0.16)" />
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `rotate(${f >= muda ? 4 * Math.sin(f / 2) * Math.max(0, 1 - (f - muda) / 20) : 0}deg)` }}>
        <Taca size={300} brilho={1.2} />
      </div>
      <Carimbo at={muda} texto="Final em risco?" top={860} cor={VERMELHO} size={80} />
      {f >= zagueiro && <Tag x={540} y={1060} at={zagueiro} texto="POR CAUSA DE 1 ZAGUEIRO" size={50} rot={2} />}
    </Cena>
  );
};

const Datas: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const assinou = momento("datas", "assinou", 0.2);
  const janela = momento("datas", "janela", 0.6);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo />
      {f < janela ? (
        <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center" }}><Camisa at={0} /></div>
      ) : (
        <Folha at={janela} dia="2" mes="SETEMBRO" texto="Janela fecha" cor={VERMELHO} x={300} y={420} />
      )}
      <Folha at={f < janela ? assinou + 10 : 0} dia="9" mes="OUTUBRO" texto="Rojo assina" cor="#1F6FEB" x={f < janela ? 540 : 780} y={f < janela ? 820 : 520} />
    </Cena>
  );
};

const Negada: React.FC<{ len: number }> = ({ len }) => {
  const zero = momento("negada", "terminou", 0.75);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo luz="rgba(229,57,53,0.12)" />
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 0.55 }}><Camisa at={0} size={360} /></div>
      <Carimbo at={momento("negada", "barrou", 0.15)} texto="Inscrição negada" top={500} size={84} />
      <Placar at={zero} titulo="IDA · SEM ROJO" a="EST" b="FLA" ga="0" gb="0" top={830} />
    </Cena>
  );
};

const Tas: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const prov = momento("tas", "liberacao", 0.6);
  const vesp = momento("tas", "vespera", 0.85);
  const martelo = lerp(f, prov - 8, prov);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo />
      <Titulo top={290} size={120} linhas={[{ t: "TAS" }, { t: "tribunal do esporte", caixa: true, at: momento("tas", "tribunal", 0.3) }]} />
      <div style={{ position: "absolute", top: 650, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <svg width="340" height="260" viewBox="0 0 170 130" style={{ transform: `rotate(${-35 + 35 * martelo}deg)`, transformOrigin: "75% 80%" }}>
          <rect x="20" y="20" width="70" height="34" rx="6" fill="#8B5A2B" stroke={OURO} strokeWidth="3" transform="rotate(-20 55 37)" />
          <rect x="60" y="45" width="90" height="12" rx="5" fill="#6B3F1C" transform="rotate(-20 55 37)" />
          <rect x="70" y="112" width="90" height="14" rx="4" fill="#4e3520" />
        </svg>
      </div>
      <Carimbo at={prov} texto="Liberação provisória" top={960} cor={OURO} size={72} rot={-3} />
      {f >= vesp && <Tag x={540} y={1150} at={vesp} texto="NA VÉSPERA DA VOLTA" size={46} cor={VERMELHO} corTexto="white" rot={2} />}
    </Cena>
  );
};

const Maracana: React.FC<{ len: number }> = ({ len }) => {
  const pen = momento("maracana", "penaltis", 0.8);
  return (
    <Cena len={len} zoom={0.04}>
      <Fundo luz="rgba(229,57,53,0.14)" />
      <Titulo top={290} size={110} linhas={[{ t: "volta no" }, { t: "Maracanã", caixa: true, at: 6 }]} />
      <Duelo a={EST} b={FLA} at={momento("maracana", "estudiantes", 0.45)} top={600} size={250} />
      <Placar at={pen} titulo="PÊNALTIS · COM ROJO" a="EST" b="FLA" ga="3" gb="2" top={1040} />
    </Cena>
  );
};

const Pedido: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const negou = momento("pedido", "negou", 0.3);
  const recado = momento("pedido", "recado", 0.55);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo />
      {f < recado ? (
        <>
          <Titulo top={300} size={110} linhas={[{ t: "Flamengo pede" }, { t: "3 a 0", caixa: true, at: momento("pedido", "vitoria", 0.15) }]} />
          <Carimbo at={negou} texto="Conmebol: negado" top={700} size={84} />
        </>
      ) : (
        <div style={{ position: "absolute", top: 380, left: 70, right: 70, opacity: lerp(f, recado, recado + 8) }}>
          <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 36, color: OURO, letterSpacing: 4, marginBottom: 20 }}>O RECADO DO TAS</div>
          <div style={{ fontFamily: ANTON, fontSize: 112, lineHeight: 1.05, color: "white", textTransform: "uppercase" }}>
            “O risco é <span style={{ color: OURO }}>todo do</span> Estudiantes”
          </div>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30, color: "rgba(255,255,255,0.6)", marginTop: 26 }}>
            A liberação foi provisória e não protegeu o clube de uma punição.
          </div>
        </div>
      )}
    </Cena>
  );
};

const Fim: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame();
  const ese = momento("fim", "se", 0.6);
  return (
    <Cena len={len} zoom={0.03}>
      <Fundo luz="rgba(245,197,24,0.14)" />
      {f < ese ? (
        <>
          <Titulo top={290} size={110} linhas={[{ t: "Final" }, { t: "28/11", caixa: true, at: momento("fim", "vinte", 0.4) }]} />
          <Duelo a={PAL} b={EST} at={momento("fim", "palmeiras", 0.3)} top={650} size={250} />
        </>
      ) : (
        <>
          <Titulo top={300} size={100} linhas={[{ t: "E se o TAS" }, { t: "der razão ao", at: 4 }, { t: "Flamengo?", caixa: true, at: 8 }]} />
          <Tag x={540} y={1150} at={momento("fim", "comenta", 0.85)} texto="💬 COMENTA AÍ" size={56} rot={-2} />
        </>
      )}
    </Cena>
  );
};

const CENAS: Record<string, React.FC<{ len: number }>> = { gancho: Gancho, datas: Datas, negada: Negada, tas: Tas, maracana: Maracana, pedido: Pedido, fim: Fim };

export const Quente02: React.FC = () => {
  const sfx = (src: string, at: number, volume = 0.5) => (
    <Sequence from={at} key={`${src}-${at}`}><Audio src={staticFile(`audio/${src}.wav`)} volume={volume} /></Sequence>
  );
  return (
    <AbsoluteFill style={{ background: "#0A0A0E" }}>
      {segs.map((s) => {
        const C = CENAS[s.id];
        const primeiro = s.id === segs[0].id;
        return (
          <Sequence key={s.id} from={primeiro ? 0 : s.ini} durationInFrames={primeiro ? s.ini + s.len : s.len}>
            <C len={s.len} />
          </Sequence>
        );
      })}
      <Sequence from={fimFala}><Final chamada="Segue pra saber o desfecho" /></Sequence>
      <Selo serie="PAUTA QUENTE" parte="LIBERTADORES" />
      <Legenda blocos={blocos} />
      <Sequence from={INICIO}><Audio src={staticFile("audio/narracao-quente02.wav")} /></Sequence>
      {segs.slice(1).map((s) => sfx("whoosh", s.ini - 4, 0.35))}
      {sfx("impacto", seg("gancho").ini + momento("gancho", "mudar", 0.35), 0.55)}
      {sfx("impacto", seg("negada").ini + momento("negada", "barrou", 0.15), 0.55)}
      {sfx("impacto", seg("tas").ini + momento("tas", "liberacao", 0.6), 0.5)}
      {sfx("impacto", seg("pedido").ini + momento("pedido", "negou", 0.3), 0.55)}
    </AbsoluteFill>
  );
};
