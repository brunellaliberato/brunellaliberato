"""Gera a narração, um arquivo por segmento do roteiro, com pausas dramáticas.

Uso: python3 scripts/narracao.py            -> gera só o que falta
     python3 scripts/narracao.py --refazer  -> apaga e gera tudo de novo
     VOZ=brunella python3 scripts/narracao.py --refazer  -> usa a voz clonada da Brunella

A narração inteira é gerada numa TOMADA ÚNICA (como uma locução de verdade, sem emendas).
"//" na `fala` vira reticências (pausa de suspense); "/" some e vale a pontuação do texto.
Depois transcreve, compara com o roteiro (regera com outra seed se errar palavra) e divide a tomada
entre os trechos pelas palavras, para as cenas e legendas acompanharem.
Saída: public/audio/narracao.wav + src/data/{inicios,duracoes,palavras}.json (não precisa rodar tempos.py).

Voz: VoiceStudio (API local em 127.0.0.1:3900, o app precisa estar aberto).
- masculina (padrão): voz masculina criada por nós (audio-src/referencia-voz-masculina.wav)
- fiquesabendo: perfil "Narrador Fique Sabendo (clone autorizado)" do VoiceStudio
- narrador: voz "C" (homem, meia-idade, grave), clonada a partir de audio-src/referencia-narrador.wav
- brunella: amostra da Voz Brunella
Sem o VoiceStudio aberto, cai para a voz Luciana do Mac (só para teste).

Saída: public/audio/<id>.wav e src/data/duracoes.json.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTE = os.environ.get("PARTE", "1")
# Parte 1 usa os caminhos originais; as outras ficam em src/data/parteN/ e narracao-parteN.wav
DADOS = ROOT / "src/data" if PARTE == "1" else ROOT / f"src/data/parte{PARTE}"
SUF = "" if PARTE == "1" else f"-parte{PARTE}"
roteiro = json.loads((DADOS / "roteiro.json").read_text())
raw = ROOT / "audio-src"
out = ROOT / "public/audio"
pedacos = raw / "pedacos"
for d in (raw, out, pedacos):
    d.mkdir(parents=True, exist_ok=True)

VS = os.environ.get("VOICESTUDIO_URL", "http://127.0.0.1:3900")
VOZES = {
    "masculina": {
        # voz masculina criada por nós: design "male, young adult, high pitch", seed 11 (WAV original, não o MP3)
        "ref": raw / "referencia-voz-masculina.wav",  # speed 1.08: mais vivo
        "ref_text": ("Tá todo mundo falando disso, mas ninguém te explicou direito. Dá pra resolver? Dá. Mas tem que ser antes. "
                     "Bora desenrolar essa história. Passo um: anota isso aí, porque quase todo mundo erra."),
        "speed": "1.08",
    },
    "fiquesabendo": {
        # perfil "Narrador Fique Sabendo (clone autorizado)" do VoiceStudio (id beabdd32)
        "ref": raw / "referencia-fiquesabendo.wav",
        "perfil": "beabdd32",
        "ref_text": ("Deixar a tela do celular amarelinha antes de dormir não protege o seu sono. O vilão é outro. "
                     "Tudo começou com a luz azul. Em dois mil e quinze, pesquisadores de Boston fizeram jovens lerem "
                     "num tablet por quatro horas antes de dormir, cinco noites seguidas."),
        "speed": "1.0",
    },
    "narrador": {
        "ref": raw / "referencia-narrador.wav",
        "ref_text": ("Em mil novecentos e oitenta e três, roubaram a Copa do Mundo. De dentro da sede da CBF. "
                     "O vidro era blindado... mas a moldura era de madeira. Eles não precisaram quebrar o vidro. "
                     "Arrancaram a moldura."),
        "speed": "0.88",
    },
    "brunella": {
        "ref": raw / "referencia-voz-brunella.wav",
        "ref_text": ("Sabe aquele plano que você está adiando faz tempo? A hora de começar não é segunda-feira, "
                     "não é no mês que vem, é agora. Pequenos passos todos os dias geram grandes resultados no final. "
                     "Esquece a perfeição e foca na constância. Bora fazer acontecer."),
        "speed": "1.0",
    },
}
NOME_VOZ = os.environ.get("VOZ", "masculina")
VOZ = VOZES[NOME_VOZ]
PAUSA = {"/": 0.45, "//": 0.9}
# tratamento da voz: só limpa grave e nivela de leve. O corte das pontas é feito por corpo_da_fala().
# sem tratamento: a referência agora é o WAV original, a voz sai limpa do modelo
FILTRO_FRASE = "highpass=f=60"


def corpo_da_fala(wav):
    """Acha onde a fala começa e termina, ignorando ruídos soltos que o modelo solta antes/depois da frase.

    Mede o volume em janelas de 10 ms, junta trechos de som separados por menos de 0,25 s e
    descarta ilhas curtas (< 0,25 s) nas pontas que estejam isoladas por mais de 0,3 s de silêncio.
    """
    import array
    import math
    import wave
    with wave.open(str(wav)) as w:
        sr = w.getframerate()
        a = array.array("h", w.readframes(w.getnframes()))
    jan = sr // 100
    db = []
    for i in range(0, len(a), jan):
        bloco = a[i:i + jan]
        rms = math.sqrt(sum(x * x for x in bloco) / max(len(bloco), 1)) / 32768
        db.append(20 * math.log10(rms + 1e-9))
    pico = max(db)
    voz = [d > pico - 32 for d in db]
    ilhas = []
    for i, v in enumerate(voz):
        if v:
            if ilhas and i - ilhas[-1][1] <= 25:
                ilhas[-1][1] = i
            else:
                ilhas.append([i, i])
    if not ilhas:
        return 0, len(a) / sr
    principal = max(ilhas, key=lambda x: x[1] - x[0])
    while len(ilhas) > 1 and ilhas[0] is not principal and ilhas[0][1] - ilhas[0][0] < 25 and ilhas[1][0] - ilhas[0][1] > 30:
        ilhas.pop(0)
    while len(ilhas) > 1 and ilhas[-1] is not principal and ilhas[-1][1] - ilhas[-1][0] < 25 and ilhas[-1][0] - ilhas[-2][1] > 30:
        ilhas.pop()
    ini = max(0, ilhas[0][0] / 100 - 0.04)
    fim = min(len(a) / sr, (ilhas[-1][1] + 1) / 100 + 0.08)
    return ini, fim


def multipart(campos, arquivos):
    b = "----vs" + os.urandom(8).hex()
    corpo = b"".join(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in campos.items())
    for nome, path in arquivos.items():
        corpo += (f'--{b}\r\nContent-Disposition: form-data; name="{nome}"; filename="ref.wav"\r\n'
                  f'Content-Type: audio/wav\r\n\r\n').encode() + Path(path).read_bytes() + b"\r\n"
    return corpo + f"--{b}--\r\n".encode(), f"multipart/form-data; boundary={b}"


def voicestudio_ok():
    try:
        return urllib.request.urlopen(VS + "/health", timeout=3).status == 200
    except Exception:
        return False


def transcreve(path):
    b = "----vs" + os.urandom(8).hex()
    campos = {"language": "pt", "response_format": "verbose_json", "timestamp_granularities[]": "word"}
    corpo = b"".join(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in campos.items())
    corpo += f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode()
    corpo += Path(path).read_bytes() + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request(VS + "/v1/audio/transcriptions", data=corpo,
                                 headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    return json.loads(urllib.request.urlopen(req, timeout=600).read()).get("words", [])


NUMEROS = {"mil", "novecentos", "oitenta", "setenta", "tres", "dezenove", "e"}


def norm(x):
    import unicodedata
    x = unicodedata.normalize("NFD", x.lower())
    return re.sub(r"[^a-z0-9]", "", x)


def confere(texto, bruto):
    """Transcreve a frase gerada. Devolve (ok, ini, fim) com o trecho exato da fala.
    ok=False quando o modelo inventou sílaba no começo ou no fim."""
    palavras = [w for w in transcreve(bruto) if norm(w["word"])]
    if not palavras:
        return False, 0, 0
    esperado = [norm(w) for w in texto.split() if norm(w)]
    eq = lambda a, b: a == b or {a, b} == {"pra", "para"}
    ultima, primeira = esperado[-1], esperado[0]
    ok_fim = ultima in NUMEROS or eq(norm(palavras[-1]["word"]), ultima)
    ok_ini = primeira in NUMEROS or eq(norm(palavras[0]["word"]), primeira)
    return ok_fim and ok_ini, palavras[0]["start"], palavras[-1]["end"]


def voicestudio_tts(text, dest, seed=None):
    """Gera com qualidade máxima: 32 passos (o app usa 16, que deixa chiado metálico)."""
    campos = {"text": text, "language": "pt", "seed": seed or os.environ.get("VS_SEED", "11"), "speed": VOZ["speed"],
              "effect_preset": "raw", "num_step": "32", "denoise": "true"}
    if VOZ.get("perfil"):
        campos["profile_id"] = VOZ["perfil"]  # usa a voz exatamente como está salva no VoiceStudio
        arquivos = {}
    else:
        campos["ref_text"] = VOZ["ref_text"]
        arquivos = {"ref_audio": VOZ["ref"]}
    corpo, ct = multipart(campos, arquivos)
    req = urllib.request.Request(VS + "/generate", data=corpo, headers={"Content-Type": ct})
    dest.write_bytes(urllib.request.urlopen(req, timeout=1800).read())


def mac_tts(text, dest, seed=None):
    aiff = dest.with_suffix(".aiff")
    subprocess.run(["say", "-v", "Luciana", "-r", "170", "-o", str(aiff), text], check=True)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(aiff), str(dest)], check=True)
    aiff.unlink()


def ff(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def duration(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def frases(fala):
    """'A. / B. // C.' -> [('A.', 0.45), ('B.', 0.9), ('C.', 0)]"""
    partes = re.split(r"\s*(//|/)\s*", fala.strip())
    res = []
    for i in range(0, len(partes), 2):
        pausa = PAUSA[partes[i + 1]] if i + 1 < len(partes) else 0
        if partes[i]:
            res.append((partes[i], pausa))
    return res


def texto_corrido(fala):
    """Pausa longa (//) vira reticências; pausa curta (/) some e fica a pontuação do texto."""
    t = re.sub(r"[.…]*\s*//\s*", "... ", fala)
    t = re.sub(r"\s*/\s*", " ", t)
    return re.sub(r"\.{4,}", "...", t).strip()


EQUIV = [{"pra", "para"}]


def tokens(texto):
    return [norm(w) for w in texto.split() if norm(w)]


def nota(texto, palavras):
    """Quantas palavras sobram/faltam/trocam entre o falado e o roteiro (números ignorados)."""
    import difflib
    tira_num = lambda ws: [w for w in ws if w and not w.isdigit() and w not in NUMEROS and w != "a"]
    esp = tira_num(tokens(texto))
    got = tira_num([norm(w["word"]) for w in palavras])
    got = [next((a for a in esp if {a, g} in EQUIV), g) for g in got]
    erros, difs = 0, []
    for op, a1, a2, b1, b2 in difflib.SequenceMatcher(None, esp, got, autojunk=False).get_opcodes():
        if op != "equal":
            erros += max(a2 - a1, b2 - b1)
            difs.append(f"{' '.join(esp[a1:a2]) or '-'} => {' '.join(got[b1:b2]) or '-'}")
    return erros, difs


def divide(segmentos, palavras):
    """Distribui as palavras transcritas entre os trechos do roteiro (alinhamento por difflib)."""
    import difflib
    esp, dono = [], []
    for k, (sid, texto) in enumerate(segmentos):
        for w in tokens(texto):
            esp.append(w)
            dono.append(k)
    got = [norm(w["word"]) for w in palavras]
    seg_de = [None] * len(got)
    for op, a1, a2, b1, b2 in difflib.SequenceMatcher(None, esp, got, autojunk=False).get_opcodes():
        for j in range(b1, b2):
            if op == "equal":
                seg_de[j] = dono[a1 + (j - b1)]
            elif a2 > a1:
                seg_de[j] = dono[min(a2 - 1, a1 + (j - b1))]
    ult = 0
    for j in range(len(seg_de)):  # inserções herdam o trecho anterior
        seg_de[j] = ult if seg_de[j] is None else seg_de[j]
        seg_de[j] = max(seg_de[j], ult)  # nunca volta no tempo
        ult = seg_de[j]
    return seg_de


refazer = "--refazer" in sys.argv
if not voicestudio_ok():
    sys.exit("Abra o VoiceStudio (a narração em tomada única precisa dele).")
print("voz:", NOME_VOZ)
SEEDS = [os.environ.get("VS_SEED", "11"), "23", "31", "47", "59", "71"]

segmentos = [(seg["id"], texto_corrido(seg["fala"])) for seg in roteiro["segmentos"]]
texto = "\n".join(t for _, t in segmentos)
print("texto:\n" + texto)
take = raw / f"narracao-take{SUF}.wav"
marca = take.with_suffix(".json")
if refazer:
    take.unlink(missing_ok=True)
    marca.unlink(missing_ok=True)
if not marca.exists():
    melhor = None
    for seed in SEEDS:
        tentativa = raw / f"narracao-s{seed}.wav"
        print("gerando tomada única, seed", seed)
        voicestudio_tts(texto, tentativa, seed)
        palavras = [w for w in transcreve(tentativa) if norm(w["word"])]
        erros, difs = nota(texto, palavras)
        print(f"   erros: {erros}", difs)
        if melhor is None or erros < melhor[0]:
            melhor = (erros, tentativa, palavras)
        if erros == 0:
            break
    erros, escolhido, palavras = melhor
    escolhido.replace(take)
    for f in raw.glob("narracao-s*.wav"):
        f.unlink()
    marca.write_text(json.dumps({"erros": erros, "palavras": palavras}, ensure_ascii=False))

palavras = json.loads(marca.read_text())["palavras"]
ini = max(0, palavras[0]["start"] - 0.12)
fim = min(duration(take), palavras[-1]["end"] + 0.5)
wav = out / f"narracao{SUF}.wav"
ff("-i", str(take), "-af", f"atrim={ini:.3f}:{fim:.3f},asetpts=PTS-STARTPTS,{FILTRO_FRASE},"
   f"afade=t=in:d=0.02,afade=t=out:st={fim - ini - 0.15:.3f}:d=0.15", "-ar", "48000", "-ac", "1", str(wav))

# tempos relativos ao arquivo cortado
for w in palavras:
    w["start"] -= ini
    w["end"] -= ini
dono = divide(segmentos, palavras)
inicios = {}
for k, (sid, _) in enumerate(segmentos):
    idx = [j for j, d in enumerate(dono) if d == k]
    if k == 0:
        inicios[sid] = 0.0
    elif idx:
        anterior = max(j for j, d in enumerate(dono) if d < k)
        inicios[sid] = round((palavras[anterior]["end"] + palavras[idx[0]]["start"]) / 2, 3)
    else:
        sys.exit(f"o trecho {sid} não apareceu na transcrição")
total = duration(wav)
ids = [sid for sid, _ in segmentos]
duracoes = {sid: round((inicios[ids[k + 1]] if k + 1 < len(ids) else total) - inicios[sid], 3) for k, sid in enumerate(ids)}
por_seg = {sid: [] for sid in ids}
for w, d in zip(palavras, dono):
    sid = ids[d]
    por_seg[sid].append({"w": w["word"], "s": round(w["start"] - inicios[sid], 3), "e": round(w["end"] - inicios[sid], 3)})

(DADOS / "inicios.json").write_text(json.dumps(inicios, indent=2))
(DADOS / "duracoes.json").write_text(json.dumps(duracoes, indent=2))
(DADOS / "palavras.json").write_text(json.dumps(por_seg, ensure_ascii=False, indent=1))
for sid in ids:
    print(f"{sid:8} {inicios[sid]:6.2f}s  " + " ".join(w["w"] for w in por_seg[sid]))
print("total", round(total, 1), "s")
