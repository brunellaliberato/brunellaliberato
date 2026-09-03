import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
src, out = sys.argv[1], sys.argv[2]
f = TTFont(src)
if "fvar" in f: f = instantiateVariableFont(f, {"wght": 800})
gs = f.getGlyphSet(); cmap = f.getBestCmap()
cap = f["OS/2"].sCapHeight; k = 100/cap
res = {"cap": cap, "upem": f["head"].unitsPerEm}
for ch in "PLAYWIN0123456789":
    gn = cmap[ord(ch)]; g = gs[gn]
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}")
    g.draw(TransformPen(pen, (k, 0, 0, -k, 0, 0)))   # escala para cap=100, y para baixo
    res[ch] = {"d": pen.getCommands(), "adv": g.width*k}
# kerning por GPOS (pares simples)
kern = {}
try:
    gpos = f["GPOS"].table
    for lk in gpos.LookupList.Lookup:
        for st in lk.SubTable:
            if st.LookupType == 9: st = st.ExtSubTable
            if st.LookupType != 2: continue
            if st.Format == 1:
                cov = st.Coverage.glyphs
                for i, ps in enumerate(st.PairSet):
                    for pr in ps.PairValueRecord:
                        v = getattr(pr.Value1, "XAdvance", 0)
                        if v: kern[(cov[i], pr.SecondGlyph)] = v*k
            elif st.Format == 2:
                cov = st.Coverage.glyphs; c1 = st.ClassDef1.classDefs; c2 = st.ClassDef2.classDefs
                for g1 in cov:
                    for g2 in cmap.values():
                        v = getattr(st.Class1Record[c1.get(g1,0)].Class2Record[c2.get(g2,0)].Value1, "XAdvance", 0)
                        if v: kern[(g1, g2)] = v*k
except Exception as e: print("kern:", e)
inv = {v: kk for kk, v in cmap.items()}
res["kern"] = {f"{chr(inv[a])}{chr(inv[b])}": v for (a, b), v in kern.items() if a in inv and b in inv and chr(inv[a]) in "PLAYWIN" and chr(inv[b]) in "PLAYWIN"}
json.dump(res, open(out, "w"))
print("ok", {c: round(res[c]["adv"]) for c in "PLAYWIN"}, res["kern"])
