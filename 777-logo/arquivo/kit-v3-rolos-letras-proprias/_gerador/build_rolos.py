"""777 · Rolos — gerador do kit. Uso: python3 build_rolos.py <pasta-de-saída>"""
import sys, os, math
SP = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1]
tmp = os.path.join(SP, "tmpr"); os.makedirs(tmp, exist_ok=True)
ns = {"__name__": "lib", "__file__": os.path.join(SP, "build_salto.py")}; sys.argv = ["x", tmp]
exec(open(ns["__file__"]).read(), ns)
fmt, roundpoly, skew, suffix = ns["fmt"], ns["roundpoly"], ns["skew"], ns["suffix"]
VI, LI, TI, BR = "#5B2EFF", "#C6FF3D", "#0E0B1A", "#FFFFFF"
T15 = math.tan(math.radians(15)); Q = math.tan(math.radians(30)) - T15
BAR, STEM, R7, W7, GAP, FP, WP = 22, 26, 3, 70, 34, 20, 9
PX = PY = FP + WP; WT = 3*W7 + 2*GAP; YREF = 100 + PY
SW = WT + 2*PX + T15*(100 + 2*PY); SH = 100 + 2*PY; BASE = 100 + PY

def seven(ox):
    xr = W7 - (100-16)*Q; xl = xr - STEM
    return [(ox+x, y) for x, y in [(0,0),(W7,0),(W7,16),(xr,100),(xl,100),(xl+(100-BAR)*Q,BAR),(0,BAR)]]
SEV = [skew(seven(i*(W7+GAP)), YREF, PX, PY) for i in range(3)]
FRAME = skew([(-PX,-PY),(WT+PX,-PY),(WT+PX,100+PY),(-PX,100+PY)], YREF, PX, PY)
WINS = [skew([(i*(W7+GAP)-WP,-WP),(i*(W7+GAP)+W7+WP,-WP),(i*(W7+GAP)+W7+WP,100+WP),(i*(W7+GAP)-WP,100+WP)], YREF, PX, PY) for i in range(3)]
d7 = " ".join(roundpoly(p, R7) for p in SEV)
dF = roundpoly(FRAME, 18); dW = " ".join(roundpoly(w, 10) for w in WINS)

def selo_cor(): return f'<path fill="{VI}" d="{dF}"/><path fill="{TI}" d="{dW}"/><path fill="{LI}" d="{d7}"/>'
def selo_mono(c): return f'<path fill="{c}" fill-rule="evenodd" d="{dF} {dW}"/><path fill="{c}" d="{d7}"/>'
def svg(body, x, y, w, h, title="777"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(x)} {fmt(y)} {fmt(w)} {fmt(h)}"><title>{title}</title>{body}</svg>\n'
def put(n, s): open(os.path.join(OUT, n), "w").write(s)

put("selo.svg", svg(selo_cor(), 0, 0, SW, SH))
put("selo-preto.svg", svg(selo_mono("#000000"), 0, 0, SW, SH))
put("selo-branco.svg", svg(selo_mono(BR), 0, 0, SW, SH))
put("777-icone.svg", svg(f'<path fill="{TI}" d="{d7}"/>', PX-6, PY-2, WT + T15*100 + 12, 104))

NOME = 22
versoes = [("", selo_cor(), TI), ("-fundo-escuro", selo_cor(), BR), ("-preto", selo_mono("#000000"), "#000000"), ("-branco", selo_mono(BR), BR)]
for suf in ["PLAY", "WIN"]:
    nm = "777" + suf.lower()
    for tag, selo, ink in versoes:
        tf, tw, th = suffix(suf, ink); x0 = SW - T15*BASE + NOME
        put(f"{nm}-horizontal{tag}.svg", svg(selo + f'<g transform="translate({fmt(x0)},{fmt(BASE-100)})">{tf}</g>', 0, 0, x0+tw, SH, nm.upper()))
        k = 0.72; gv = 22; tx = (SW - tw*k)/2
        put(f"{nm}-empilhado{tag}.svg", svg(selo + f'<g transform="translate({fmt(tx)},{fmt(SH+gv)}) scale({k})">{tf}</g>', 0, 0, SW, SH+gv+100*k, nm.upper()))

# ícones: o selo inteiro sobre quadrado violeta (o próprio rolo é o ícone)
def tile(scale, rx):
    s = scale*256/SW; ty = 128 - SH*s/2
    return (f'<rect width="256" height="256" rx="{rx}" fill="{VI}"/>'
            f'<g transform="translate({fmt(128 - SW*s/2)} {fmt(ty)}) scale({fmt(s)})"><path fill="{TI}" d="{dW}"/><path fill="{LI}" d="{d7}"/></g>')
put("icones/favicon.svg", svg(tile(0.96, 56), 0, 0, 256, 256))
put("icones/app-icon.svg", svg(tile(0.86, 0), 0, 0, 256, 256))
print("ok")
