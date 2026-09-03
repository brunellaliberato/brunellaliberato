"""777 · Selo Salto — gerador do kit. Uso: python3 build_salto.py <pasta-de-saída>"""
import sys, os, math
SP = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]
tmp = os.path.join(SP, "tmpbuild"); os.makedirs(tmp, exist_ok=True)
sys.argv = ["x", tmp]; ns = {"__name__": "lib"}
exec(open(os.path.join(SP, "build_final.py")).read(), ns)
T, Q, fmt, poly, skew, seven_pts, suffix = (ns[k] for k in ["T","Q","fmt","poly","skew","seven_pts","suffix"])
VIOLETA, LIMA, TINTA, BRANCO = "#5B2EFF", "#C6FF3D", "#0E0B1A", "#FFFFFF"

def roundpoly(pts, r):
    """polígono com cantos arredondados; r pode ser número ou lista por vértice (0 = canto vivo)."""
    n = len(pts); segs = []
    rs = r if isinstance(r, list) else [r]*n
    for i in range(n):
        P = pts[i]; A = pts[i-1]; B = pts[(i+1) % n]
        u1 = (A[0]-P[0], A[1]-P[1]); l1 = math.hypot(*u1); u1 = (u1[0]/l1, u1[1]/l1)
        u2 = (B[0]-P[0], B[1]-P[1]); l2 = math.hypot(*u2); u2 = (u2[0]/l2, u2[1]/l2)
        th = math.acos(max(-1, min(1, u1[0]*u2[0] + u1[1]*u2[1])))
        rr = rs[i]
        if rr <= 0: segs.append((P, P, 0, 1)); continue
        d = rr / math.tan(th/2); lim = 0.45*min(l1, l2)
        if d > lim: d = lim; rr = d*math.tan(th/2)
        cross = (P[0]-A[0])*(B[1]-P[1]) - (P[1]-A[1])*(B[0]-P[0])
        segs.append(((P[0]+u1[0]*d, P[1]+u1[1]*d), (P[0]+u2[0]*d, P[1]+u2[1]*d), rr, 1 if cross > 0 else 0))
    s = f"M{fmt(segs[0][1][0])},{fmt(segs[0][1][1])}"
    for i in range(1, n+1):
        a, b, rr, sw = segs[i % n]
        s += f" L{fmt(a[0])},{fmt(a[1])}"
        if rr > 0: s += f" A{fmt(rr)},{fmt(rr)} 0 0 {sw} {fmt(b[0])},{fmt(b[1])}"
    return s + " Z"

def offset(pts, o):
    """desloca um polígono horário (na tela) para fora em o unidades."""
    n = len(pts); lines = []
    for i in range(n):
        (x1,y1),(x2,y2) = pts[i], pts[(i+1)%n]
        dx, dy = x2-x1, y2-y1; L = math.hypot(dx, dy); nx, ny = dy/L, -dx/L
        lines.append(((x1+nx*o, y1+ny*o), (dx, dy)))
    res = []
    for i in range(n):
        (p, d), (q, e) = lines[i-1], lines[i]
        den = d[0]*e[1] - d[1]*e[0]
        t = ((q[0]-p[0])*e[1] - (q[1]-p[1])*e[0]) / den
        res.append((p[0]+d[0]*t, p[1]+d[1]*t))
    return res

def clip_below(pts, y0):
    """corta o polígono e mantém a parte com y >= y0; marca os vértices do corte."""
    out = []; n = len(pts)
    for i in range(n):
        P, Q2 = pts[i], pts[(i+1)%n]
        pin, qin = P[1] >= y0, Q2[1] >= y0
        if pin: out.append((P, False))
        if pin != qin:
            t = (y0 - P[1]) / (Q2[1] - P[1]); out.append(((P[0]+(Q2[0]-P[0])*t, y0), True))
    return out

# ---------- geometria do selo ----------
BAR, STEM, GAP, PX, PY, JUMP, R7, RT, RING = 27, 32, 8, 20, 22, 40, 6, 14, 4.5
W7 = 3*64 + 2*GAP; YREF = 100 + PY
SEV = [skew(seven_pts(i*(64+GAP), BAR, STEM), YREF, PX, PY) for i in range(3)]
TOP = JUMP                                   # topo do selo (os 7 começam em y = PY)
TILE = skew([(-PX,TOP-PY),(W7+PX,TOP-PY),(W7+PX,100+PY),(-PX,100+PY)], YREF, PX, PY)
RINGS = [offset(p, RING) for p in SEV]
SW = W7 + 2*PX + T*(100 + 2*PY)
VB_Y = PY - RING - 1; SH = 100 + 2*PY - VB_Y   # caixa vertical do selo
BASE = 100 + PY                                # linha de base dos 7

def seven_d(): return " ".join(roundpoly(p, R7) for p in SEV)

def selo_cor():
    return (f'<path fill="{VIOLETA}" d="{roundpoly(TILE, RT)}"/>'
            f'<path fill="{VIOLETA}" d="{" ".join(roundpoly(p, R7 + RING) for p in RINGS)}"/>'
            f'<path fill="{LIMA}" d="{seven_d()}"/>')

def selo_uma_cor(c):
    holes = []
    for ring in RINGS:
        cp = clip_below(ring, TOP)
        holes.append(roundpoly([p for p, _ in cp], [0 if cut else R7 + RING for _, cut in cp]))
    return f'<path fill="{c}" fill-rule="evenodd" d="{roundpoly(TILE, RT)} {" ".join(holes)} {seven_d()}"/>'

def svg(body, x, y, w, h, title="777"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(x)} {fmt(y)} {fmt(w)} {fmt(h)}">'
            f'<title>{title}</title>{body}</svg>\n')

def put(name, s): open(os.path.join(OUT, name), "w").write(s)

# símbolos
put("selo.svg", svg(selo_cor(), 0, VB_Y, SW, SH))
put("selo-preto.svg", svg(selo_uma_cor("#000000"), 0, VB_Y, SW, SH))
put("selo-branco.svg", svg(selo_uma_cor(BRANCO), 0, VB_Y, SW, SH))
put("777-icone.svg", svg(f'<path fill="{TINTA}" d="{seven_d()}"/>', PX - 10, PY - 2, W7 + T*100 + 20, 104))

# assinaturas
NOME = 20
versoes = [("", selo_cor(), TINTA), ("-fundo-escuro", selo_cor(), BRANCO),
           ("-preto", selo_uma_cor("#000000"), "#000000"), ("-branco", selo_uma_cor(BRANCO), BRANCO)]
for suf in ["PLAY", "WIN"]:
    nm = "777" + suf.lower()
    for tag, selo, ink in versoes:
        tf, tw, th = suffix(suf, ink)
        x0 = SW - T*BASE + NOME
        put(f"{nm}-horizontal{tag}.svg",
            svg(selo + f'<g transform="translate({fmt(x0)},{fmt(BASE-100)})">{tf}</g>', 0, VB_Y, x0 + tw, SH, nm.upper()))
        k = 0.72; gv = 22; tx = (SW - tw*k)/2
        put(f"{nm}-empilhado{tag}.svg",
            svg(selo + f'<g transform="translate({fmt(tx)},{fmt(VB_Y + SH + gv)}) scale({k})">{tf}</g>',
                0, VB_Y, SW, SH + gv + 100*k, nm.upper()))

# favicon / ícone: 777 lima sobre quadrado violeta
s = 0.92; cx = PX + (W7 + T*100)/2 - 3; cy = PY + 50
fav = (f'<rect width="256" height="256" rx="56" fill="{VIOLETA}"/>'
       f'<g transform="translate({fmt(128 - cx*s)} {fmt(128 - cy*s)}) scale({s})"><path fill="{LIMA}" d="{seven_d()}"/></g>')
os.makedirs(os.path.join(OUT, "icones"), exist_ok=True)
put("icones/favicon.svg", svg(fav, 0, 0, 256, 256))
fav_full = (f'<rect width="256" height="256" fill="{VIOLETA}"/>'
            f'<g transform="translate({fmt(128 - cx*0.78)} {fmt(128 - cy*0.78)}) scale(0.78)"><path fill="{LIMA}" d="{seven_d()}"/></g>')
put("icones/app-icon.svg", svg(fav_full, 0, 0, 256, 256))
print("ok")
