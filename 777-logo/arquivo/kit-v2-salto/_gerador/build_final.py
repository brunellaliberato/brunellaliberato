import math, os, sys
OUT = sys.argv[1]
VIOLETA = "#5B2EFF"; TINTA = "#0E0B1A"; BRANCO = "#FFFFFF"
T = math.tan(math.radians(15)); Q = math.tan(math.radians(30)) - T
S = 26; H = 100

def fmt(v): return f"{v:.2f}".rstrip("0").rstrip(".")
def poly(pts): return "M" + " L".join(f"{fmt(x)},{fmt(y)}" for x, y in pts) + " Z"

# ---------- 7 (upright) ----------
def seven_pts(ox=0, bar=26, stem=30):
    xr = 64 - (100 - 22) * Q; xl = xr - stem
    return [(ox+x, y) for x, y in [(0,0),(64,0),(64,22),(xr,100),(xl,100),(xl+(100-bar)*Q,bar),(0,bar)]]

def skew(pts, yref, dx=0, dy=0):
    return [(x + T*(yref - y) + dx, y + dy) for x, y in pts]

def rounded(pts, r):
    """Convex polygon (clockwise on screen) with true circular fillets."""
    n = len(pts); out = []
    for i in range(n):
        P = pts[i]; A = pts[i-1]; B = pts[(i+1) % n]
        u1 = ((A[0]-P[0]), (A[1]-P[1])); l1 = math.hypot(*u1); u1 = (u1[0]/l1, u1[1]/l1)
        u2 = ((B[0]-P[0]), (B[1]-P[1])); l2 = math.hypot(*u2); u2 = (u2[0]/l2, u2[1]/l2)
        th = math.acos(max(-1, min(1, u1[0]*u2[0] + u1[1]*u2[1])))
        d = r / math.tan(th/2)
        out.append(((P[0]+u1[0]*d, P[1]+u1[1]*d), (P[0]+u2[0]*d, P[1]+u2[1]*d)))
    s = f"M{fmt(out[0][1][0])},{fmt(out[0][1][1])}"
    for i in range(1, n+1):
        a, b = out[i % n]
        s += f" L{fmt(a[0])},{fmt(a[1])} A{r},{r} 0 0 1 {fmt(b[0])},{fmt(b[1])}"
    return s + " Z"

# ---------- selo ----------
def selo(variant="vazado", small=False):
    """returns (svg fragment, width, height); origin = top-left of bbox."""
    if small:
        bar, stem, gap, px, py, r = 32, 37, 6, 14, 16, 14
    else:
        bar, stem, gap, px, py, r = 26, 30, 8, 20, 22, 16
    w7 = 3*64 + 2*gap; yref = 100 + py
    sev = [skew(seven_pts(i*(64+gap), bar, stem), yref, px, py) for i in range(3)]
    tile = skew([(-px,-py),(w7+px,-py),(w7+px,100+py),(-px,100+py)], yref, px, py)
    W = w7 + 2*px + T*(100 + 2*py); Hh = 100 + 2*py
    tpath = rounded(tile, r)
    if variant == "vazado":
        frag = f'<path fill="{VIOLETA}" fill-rule="evenodd" d="{tpath} {" ".join(poly(p) for p in sev)}"/>'
    elif variant == "branco7":
        frag = (f'<path fill="{VIOLETA}" d="{tpath}"/>'
                f'<path fill="{BRANCO}" d="{" ".join(poly(p) for p in sev)}"/>')
    elif variant == "so777":
        frag = f'<path fill="{TINTA}" d="{" ".join(poly(p) for p in sev)}"/>'
    return frag, W, Hh, 100 + py   # last = baseline y of the 7s

# ---------- letras (upright, altura 100) ----------
def rect(x, y, w, h): return poly([(x,y),(x+w,y),(x+w,y+h),(x,y+h)])
def L(ox): return [rect(ox,0,S,H), rect(ox,H-S,60,S)], 60
def I(ox): return [rect(ox,0,S,H)], S
def N(ox):
    W=80; o=48
    return [poly([(ox+x,y) for x,y in [(0,100),(0,0),(S,0),(W-S,H-o),(W-S,0),(W,0),(W,100),(W-S,100),(S,o),(S,100)]])], W
def P(ox):
    W=70; R=32; r=10; cx=ox+W-R
    return [f"M{ox},0 H{cx} A{R},{R} 0 0 1 {cx},{2*R} H{ox+S} V100 H{ox} Z M{ox+S},{R-r} H{cx} A{r},{r} 0 0 1 {cx},{R+r} H{ox+S} Z"], W
def A(ox):
    # perna esquerda a 30° e direita vertical depois da inclinação de 15°
    tl=100*Q; tr=tl+28; br=tr+100*T; ir=br-26; y=60
    o = poly([(ox+x,yy) for x,yy in [(0,100),(tl,0),(tr,0),(br,100),(ir,100),(ir-T*20,80),(26+Q*20,80),(26,100)]])
    d = (ir-26)/(Q+T); ay = 100-d
    i = poly([(ox+26+Q*(100-y),y),(ox+ir-T*(100-y),y),(ox+26+Q*d,ay)])
    return [o+" "+i], br
def Y(ox): return [poly([(ox+x,y) for x,y in [(0,0),(29,0),(44,32),(59,0),(88,0),(57,58),(57,100),(31,100),(31,58)]])], 88
def Wg(ox): return [poly([(ox+x,y) for x,y in [(0,0),(26,0),(37,58),(50,0),(74,0),(87,58),(98,0),(124,0),(102,100),(74,100),(62,46),(50,100),(22,100)]])], 124
G = {"P":P,"L":L,"A":A,"Y":Y,"W":Wg,"I":I,"N":N}
KERN = {("A","Y"):-12,("L","A"):-2}

def suffix(text, color, track=7):
    paths=[]; x=0; prev=None
    for ch in text:
        x += KERN.get((prev,ch),0); p,w = G[ch](x); paths += p; x += w + track; prev = ch
    wt = x - track
    inner = "".join(f'<path fill="{color}" fill-rule="evenodd" d="{d}"/>' for d in paths)
    frag = f'<g transform="translate({fmt(T*100)},0) skewX(-15)">{inner}</g>'
    return frag, wt + T*100, 100

def doc(body, w, h, title, pad=0):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(-pad)} {fmt(-pad)} {fmt(w+2*pad)} {fmt(h+2*pad)}">'
            f'<title>{title}</title>{body}</svg>\n')
def write(name, s): open(os.path.join(OUT, name), "w").write(s)

# símbolos
for v, name in [("vazado","selo"),("branco7","selo-fundo-escuro")]:
    f, w, h, _ = selo(v); write(f"{name}.svg", doc(f, w, h, "777"))
f, w, h, _ = selo("vazado", small=True); write("selo-pequeno.svg", doc(f, w, h, "777"))
f, w, h, _ = selo("so777", small=True); write("777-icone.svg", doc(f, w, h, "777"))

# assinaturas
GAP = 20
for suf in ["PLAY","WIN"]:
    nm = "777" + suf.lower()
    for tone, sv, ink in [("", "vazado", TINTA), ("-fundo-escuro", "branco7", BRANCO)]:
        sf, sw, sh, base = selo(sv)
        tf, tw, th = suffix(suf, ink)
        # horizontal: sufixo na linha de base dos 7, folga paralela de 20
        x0 = (sw - T*(sh - base)) - T*(sh-base)*0 + GAP - T*0
        selo_right_at_base = sw - T*(base)   # borda direita do selo na altura da base dos 7
        x0 = selo_right_at_base + GAP
        body = sf + f'<g transform="translate({fmt(x0)},{fmt(base-100)})">{tf}</g>'
        write(f"{nm}-horizontal{tone}.svg", doc(body, x0 + tw, sh, nm.upper()))
        # empilhado: sufixo a 72 %, centrado
        k = 0.72; gap_v = 22
        tx = (sw - tw*k) / 2
        body = sf + f'<g transform="translate({fmt(tx)},{fmt(sh+gap_v)}) scale({k})">{tf}</g>'
        write(f"{nm}-empilhado{tone}.svg", doc(body, sw, sh + gap_v + 100*k, nm.upper()))
print("ok")
