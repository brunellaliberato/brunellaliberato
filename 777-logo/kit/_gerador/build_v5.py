"""777 · logotipo final (Sora ExtraBold, risco em lima). Uso: build_v5.py <saída>"""
import sys, os, json, math
SP = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1]
F = json.load(open(os.path.join(SP, "sora-800.json")))
VI, LI, TI, BR = "#5B2EFF", "#C6FF3D", "#0E0B1A", "#FFFFFF"
SK = 14; T = math.tan(math.radians(SK))
def fmt(v): return f"{v:.2f}".rstrip("0").rstrip(".")
def put(n, s): open(os.path.join(OUT, n), "w").write(s)

def glyphs(text, x, color, track=0):
    parts = ""; prev = None; xs = []
    for ch in text:
        if prev: x += F["kern"].get(prev+ch, 0)
        xs.append(x)
        parts += f'<path fill="{color}" transform="translate({fmt(x)},100)" d="{F[ch]["d"]}"/>'
        x += F[ch]["adv"] + track; prev = ch
    return parts, x - track, xs

def sevens(color):
    g, x, xs = glyphs("777", 0, color, track=-12)
    bar = f'<rect fill="{color}" x="{fmt(xs[0]+6)}" y="0" width="{fmt(x-xs[0]-12)}" height="21"/>'
    return g + bar, x, xs

def risco(x0, x1, color):
    """risco reto em lima sob o 777: ponta à esquerda, corpo de 12, ponta longa à direita sob a 1ª letra do nome."""
    y0 = 122; y1 = 106
    return (f'<path fill="{color}" d="M{fmt(x0)},{fmt(y0+4)} L{fmt(x0+40)},{fmt(y0-1)} '
            f'L{fmt(x1)},{fmt(y1)} L{fmt(x1-8)},{fmt(y1+6)} L{fmt(x0+40)},{fmt(y0+11)} Z"/>')

def doc(inner, w, title, pad=36, h=130):
    W = w + T*h
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(-pad)} {fmt(-pad)} {fmt(W+2*pad)} {fmt(h+2*pad)}"><title>{title}</title>'
            f'<g transform="translate({fmt(T*h)},0) skewX(-{SK})">{inner}</g></svg>\n')

def logo(suf, c7, cn, cr):
    g7, x7, xs = sevens(c7)
    if suf:
        gn, xn, xn_s = glyphs(suf, x7 + 4, cn)
        r = risco(xs[0] - 10, xn_s[0] + 72, cr)
        return r + g7 + gn, xn
    r = risco(xs[0] - 10, x7 + 30, cr)
    return r + g7, x7 + 30

# principais (fundo escuro) · alternativas (fundo claro: 777 tinta) · uma cor
for suf in ["PLAY", "WIN", ""]:
    nm = "777" + suf.lower() if suf else "777"
    b, w = logo(suf, BR, LI, LI);        put(f"{nm}.svg", doc(b, w, nm.upper()))
    b, w = logo(suf, TI, LI, LI);        put(f"{nm}-fundo-claro.svg", doc(b, w, nm.upper()))
    b, w = logo(suf, BR, BR, BR);        put(f"{nm}-branco.svg", doc(b, w, nm.upper()))
    b, w = logo(suf, "#000", "#000", "#000"); put(f"{nm}-preto.svg", doc(b, w, nm.upper()))

# ícones: 777P / 777W / 777 em quadrado violeta
def tile(inner, w, h, scale, rx):
    W = w + T*h; s = scale*256/W
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>777</title>'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6E42FF"/><stop offset="1" stop-color="#4A1FD6"/></linearGradient></defs>'
            f'<rect width="256" height="256" rx="{rx}" fill="url(#g)"/>'
            f'<g transform="translate({fmt(128 - W*s/2)} {fmt(128 - h*s/2)}) scale({fmt(s)})"><g transform="translate({fmt(T*h)},0) skewX(-{SK})">{inner}</g></g></svg>\n')
for key, suf in [("777play", "P"), ("777win", "W"), ("777", "")]:
    g7, x7, xs = sevens(BR)
    if suf:
        gn, xn, xn_s = glyphs(suf, x7 + 4, LI); r = risco(xs[0]-10, xn_s[0] + 60, LI); body = r + g7 + gn; w = xn
    else:
        r = risco(xs[0]-10, x7 + 30, LI); body = r + g7; w = x7 + 30
    put(f"icones/app-icon-{key}.svg", tile(body, w, 130, 0.84, 58))
    put(f"icones/app-icon-{key}-quadrado.svg", tile(body, w, 130, 0.84, 0))
# favicon = 777 sozinho
g7, x7, xs = sevens(BR); r = risco(xs[0]-10, x7 + 30, LI)
put("icones/favicon.svg", tile(r + g7, x7 + 30, 130, 0.9, 56))
print("ok")
