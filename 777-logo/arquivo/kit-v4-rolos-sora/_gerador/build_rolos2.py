"""777 · Rolos v2 (Sora ExtraBold, empilhado com play, rolos escuros ou lima). Uso: build_rolos2.py <saída> [lima]"""
import sys, os, math, json
SP = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1]; LIMA_ROLOS = len(sys.argv) > 2 and sys.argv[2] == "lima"
tmp = os.path.join(SP, "tmpr2"); os.makedirs(tmp, exist_ok=True)
ns = {"__name__": "lib", "__file__": os.path.join(SP, "build_salto.py")}; sys.argv = ["x", tmp]
exec(open(ns["__file__"]).read(), ns)
fmt, roundpoly, skew = ns["fmt"], ns["roundpoly"], ns["skew"]
FONT = json.load(open(os.path.join(SP, "sora-800.json")))
VI, LI, TI, BR = "#5B2EFF", "#C6FF3D", "#0E0B1A", "#FFFFFF"
T15 = math.tan(math.radians(15)); Q = math.tan(math.radians(30)) - T15
BAR, STEM, R7, W7, GAP, FP, WP = 22, 26, 3, 70, 34, 20, 9
PX = PY = FP + WP; WT = 3*W7 + 2*GAP; YREF = 100 + PY
SW = WT + 2*PX + T15*(100 + 2*PY); SH = 100 + 2*PY; BASE = 100 + PY
ROLO, SETE = (LI, VI) if LIMA_ROLOS else (TI, LI)

def seven(ox):
    xr = W7 - (100-16)*Q; xl = xr - STEM
    return [(ox+x, y) for x, y in [(0,0),(W7,0),(W7,16),(xr,100),(xl,100),(xl+(100-BAR)*Q,BAR),(0,BAR)]]
SEV = [skew(seven(i*(W7+GAP)), YREF, PX, PY) for i in range(3)]
FRAME = skew([(-PX,-PY),(WT+PX,-PY),(WT+PX,100+PY),(-PX,100+PY)], YREF, PX, PY)
WINS = [skew([(i*(W7+GAP)-WP,-WP),(i*(W7+GAP)+W7+WP,-WP),(i*(W7+GAP)+W7+WP,100+WP),(i*(W7+GAP)-WP,100+WP)], YREF, PX, PY) for i in range(3)]
d7 = " ".join(roundpoly(p, R7) for p in SEV); dF = roundpoly(FRAME, 18); dW = " ".join(roundpoly(w, 10) for w in WINS)

def selo_cor(): return f'<path fill="{VI}" d="{dF}"/><path fill="{ROLO}" d="{dW}"/><path fill="{SETE}" d="{d7}"/>'
def selo_mono(c): return f'<path fill="{c}" fill-rule="evenodd" d="{dF} {dW}"/><path fill="{c}" d="{d7}"/>'
def svg(body, x, y, w, h, title="777"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(x)} {fmt(y)} {fmt(w)} {fmt(h)}"><title>{title}</title>{body}</svg>\n'
def put(n, s): open(os.path.join(OUT, n), "w").write(s)

TRACK = 4   # ajuste leve de espaçamento além do da fonte
def word(text, color, play=False):
    """Sora ExtraBold em caixa alta, inclinada 15°. Devolve (fragmento, largura)."""
    x = 0; parts = ""
    if play:   # triângulo de play em lima, altura 56, centrado na altura das maiúsculas
        h = 56; y0 = (100-h)/2; w = h*0.9
        parts += f'<path fill="{LI}" d="{roundpoly([(0,y0),(w,50),(0,y0+h)], 4)}"/>'; x = w + 26
    prev = None
    for ch in text:
        if prev: x += FONT["kern"].get(prev+ch, 0)
        g = FONT[ch]; parts += f'<path fill="{color}" transform="translate({fmt(x)},100)" d="{g["d"]}"/>'
        x += g["adv"] + TRACK; prev = ch
    x -= TRACK
    # recorta a margem lateral da primeira e última letra (lsb/rsb) com folga fixa
    return f'<g transform="translate({fmt(T15*100)},0) skewX(-15)">{parts}</g>', x + T15*100

put("selo.svg", svg(selo_cor(), 0, 0, SW, SH))
put("selo-preto.svg", svg(selo_mono("#000000"), 0, 0, SW, SH))
put("selo-branco.svg", svg(selo_mono(BR), 0, 0, SW, SH))

NOME = 20
versoes = [("", selo_cor(), TI), ("-fundo-escuro", selo_cor(), BR), ("-preto", selo_mono("#000000"), "#000000"), ("-branco", selo_mono(BR), BR)]
for suf in ["PLAY", "WIN"]:
    nm = "777" + suf.lower()
    for tag, selo, ink in versoes:
        mono = tag in ("-preto", "-branco")
        wf, ww = word(suf, ink); x0 = SW - T15*BASE + NOME
        put(f"{nm}-horizontal{tag}.svg", svg(selo + f'<g transform="translate({fmt(x0)},{fmt(BASE-100)})">{wf}</g>', 0, 0, x0+ww, SH, nm.upper()))
        wf2, ww2 = word(suf, ink, play=(suf == "PLAY" and not mono))
        k = 0.62; gv = 18; tx = (SW - ww2*k)/2 + T15*20
        put(f"{nm}-empilhado{tag}.svg", svg(selo + f'<g transform="translate({fmt(tx)},{fmt(SH+gv)}) scale({k})">{wf2}</g>', 0, 0, SW, SH+gv+100*k, nm.upper()))

# ícones
os.makedirs(os.path.join(OUT, "icones"), exist_ok=True)
def tile(body, bw, bh, scale, rx, bg=VI):
    s = scale*256/max(bw, bh*1.25)
    return (f'<rect width="256" height="256" rx="{rx}" fill="{bg}"/>'
            f'<g transform="translate({fmt(128 - bw*s/2)} {fmt(128 - bh*s/2)}) scale({fmt(s)})">{body}</g>')
put("icones/favicon.svg", svg(tile(selo_cor(), SW, SH, 0.96, 56), 0, 0, 256, 256))
for suf in ["PLAY", "WIN"]:
    wf2, ww2 = word(suf, BR, play=(suf == "PLAY")); k = 0.62; gv = 18; tx = (SW - ww2*k)/2 + T15*20
    body = selo_cor() + f'<g transform="translate({fmt(tx)},{fmt(SH+gv)}) scale({k})">{wf2}</g>'
    put(f"icones/app-icon-777{suf.lower()}.svg", svg(tile(body, SW, SH+gv+100*k, 0.84, 0, TI), 0, 0, 256, 256))
print("ok", "lima" if LIMA_ROLOS else "escuro")
