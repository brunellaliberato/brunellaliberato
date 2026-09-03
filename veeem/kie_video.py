#!/usr/bin/env python3
"""Gera vídeos no Seedance 2.5 pela API do KIE (kie.ai).

Uso rápido (rode de dentro da pasta veeem):
  python3 kie_video.py saldo
  python3 kie_video.py gerar --prompt prompts/abertura.txt --ref referencias/embaixador.jpg
  python3 kie_video.py gerar ... --confirmar      # só gasta crédito com --confirmar
  python3 kie_video.py status <taskId>            # retoma um vídeo já pedido

A chave fica em veeem/.env (KIE_API_KEY=...). Nunca coloque a chave no chat.
"""

import argparse
import json
import mimetypes
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path

PASTA = Path(__file__).resolve().parent
API = "https://api.kie.ai"
UPLOAD = "https://kieai.redpandaai.co/api/file-stream-upload"
MODELO = "bytedance/seedance-2-5"
PASTA_VIDEOS = PASTA / "videos"

# Créditos por segundo gerado, gerando a partir de texto/imagens (tabela do site, beta).
CREDITOS_POR_SEGUNDO = {"480p": 28, "720p": 63, "1080p": 158}
DOLAR_POR_SEGUNDO = {"480p": 0.140, "720p": 0.315, "1080p": 0.790}


def erro(msg):
    print(f"\n❌ {msg}", file=sys.stderr)
    sys.exit(1)


def carregar_chave():
    chave = os.environ.get("KIE_API_KEY", "").strip()
    env = PASTA / ".env"
    if not chave and env.exists():
        for linha in env.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if linha.startswith("KIE_API_KEY="):
                chave = linha.split("=", 1)[1].strip().strip('"').strip("'")
    if not chave:
        erro(f"Chave não encontrada. Abra {env} e cole a chave depois de KIE_API_KEY=")
    return chave


def chamar(metodo, url, chave, corpo=None, cabecalhos=None):
    h = {"Authorization": f"Bearer {chave}", "User-Agent": "veeem-kie-script/1.0"}
    if cabecalhos:
        h.update(cabecalhos)
    dados = None
    if corpo is not None:
        if isinstance(corpo, (bytes, bytearray)):
            dados = bytes(corpo)
        else:
            dados = json.dumps(corpo).encode("utf-8")
            h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=dados, headers=h, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            resp = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        corpo_erro = e.read().decode("utf-8", "replace")[:500]
        erro(f"A API respondeu HTTP {e.code}: {corpo_erro}")
    except urllib.error.URLError as e:
        erro(f"Sem conexão com a API: {e.reason}")
    # O KIE devolve HTTP 200 mesmo em erro; o que vale é o campo "code".
    if resp.get("code") != 200:
        explicacao = {401: "chave inválida", 402: "créditos insuficientes",
                      429: "muitas chamadas, espere um pouco"}.get(resp.get("code"), "")
        erro(f"A API recusou (code {resp.get('code')}{', ' + explicacao if explicacao else ''}): {resp.get('msg')}")
    return resp


def saldo(chave):
    return chamar("GET", f"{API}/api/v1/chat/credit", chave)["data"]


def enviar_arquivo(caminho, chave):
    """Sobe uma imagem local para o KIE e devolve o link público (vale 24h)."""
    caminho = Path(caminho)
    fronteira = uuid.uuid4().hex
    tipo = mimetypes.guess_type(caminho.name)[0] or "application/octet-stream"
    partes = []
    for nome, valor in (("uploadPath", "veeem/referencias"),
                        ("fileName", f"{uuid.uuid4().hex[:8]}-{caminho.name}")):
        partes.append(f'--{fronteira}\r\nContent-Disposition: form-data; name="{nome}"\r\n\r\n{valor}\r\n'.encode())
    partes.append(
        f'--{fronteira}\r\nContent-Disposition: form-data; name="file"; filename="{caminho.name}"\r\n'
        f"Content-Type: {tipo}\r\n\r\n".encode()
        + caminho.read_bytes() + b"\r\n"
    )
    partes.append(f"--{fronteira}--\r\n".encode())
    resp = chamar("POST", UPLOAD, chave, b"".join(partes),
                  {"Content-Type": f"multipart/form-data; boundary={fronteira}"})
    return resp["data"]["downloadUrl"]


def ler_prompt(valor):
    p = Path(valor)
    if not p.is_absolute():
        p = PASTA / valor if (PASTA / valor).exists() else Path(valor)
    if p.exists() and p.is_file():
        return p.read_text(encoding="utf-8").strip()
    return valor.strip()


def resolver_ref(valor):
    if valor.startswith(("http://", "https://")):
        return valor
    p = Path(valor)
    if not p.is_absolute() and (PASTA / valor).exists():
        p = PASTA / valor
    if not p.exists():
        erro(f"Imagem de referência não encontrada: {valor}")
    if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        erro(f"{p.name}: o Seedance só aceita jpg, png ou webp.")
    if p.stat().st_size > 30 * 1024 * 1024:
        erro(f"{p.name}: passa de 30 MB.")
    return p


def resolver_audio(valor):
    if valor.startswith(("http://", "https://")):
        return valor
    p = Path(valor)
    if not p.is_absolute() and (PASTA / valor).exists():
        p = PASTA / valor
    if not p.exists():
        erro(f"Áudio de referência não encontrado: {valor}")
    if p.suffix.lower() not in (".wav", ".mp3", ".aac", ".ogg"):
        erro(f"{p.name}: o Seedance só aceita wav, mp3, aac ou ogg.")
    if p.stat().st_size > 15 * 1024 * 1024:
        erro(f"{p.name}: passa de 15 MB.")
    try:
        dur = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
            capture_output=True, text=True, check=True).stdout.strip())
        if not 2 <= dur <= 30:
            erro(f"{p.name}: tem {dur:.1f}s; o áudio precisa ter de 2 a 30 segundos.")
    except (FileNotFoundError, ValueError, subprocess.CalledProcessError):
        pass
    return p


def baixar(url, destino):
    req = urllib.request.Request(url, headers={"User-Agent": "veeem-kie-script/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r, open(destino, "wb") as f:
        while bloco := r.read(1 << 20):
            f.write(bloco)


def acompanhar(chave, task_id, nome):
    print(f"\n⏳ Gerando (tarefa {task_id}). Isso costuma levar alguns minutos...")
    inicio = time.time()
    ultimo = None
    while True:
        d = chamar("GET", f"{API}/api/v1/jobs/recordInfo?taskId={task_id}", chave)["data"]
        estado = d.get("state")
        if estado != ultimo:
            traducao = {"waiting": "na fila", "queuing": "na fila", "generating": "gerando",
                        "success": "pronto", "fail": "falhou"}.get(estado, estado)
            print(f"   {int(time.time() - inicio):>4}s  {traducao}")
            ultimo = estado
        if estado == "success":
            break
        if estado == "fail":
            erro(f"O vídeo falhou ({d.get('failCode')}): {d.get('failMsg')}")
        if time.time() - inicio > 40 * 60:
            erro(f"Passou de 40 min. Tente depois: python3 kie_video.py status {task_id}")
        time.sleep(10)

    resultado = d.get("response") or json.loads(d.get("resultJson") or "{}")
    urls = resultado.get("resultUrls") or []
    if not urls:
        erro(f"Pronto, mas sem link de vídeo na resposta: {resultado}")
    PASTA_VIDEOS.mkdir(exist_ok=True)
    salvos = []
    for i, url in enumerate(urls, 1):
        ext = Path(url.split("?")[0]).suffix or ".mp4"
        sufixo = f"-{i}" if len(urls) > 1 else ""
        destino = PASTA_VIDEOS / f"{nome}{sufixo}{ext}"
        baixar(url, destino)
        salvos.append(destino)
    print(f"\n✅ Vídeo salvo em:")
    for s in salvos:
        print(f"   {s}")
    if d.get("creditsConsumed") is not None:
        print(f"   Créditos gastos: {d['creditsConsumed']}")
    registrar(task_id, nome, salvos, d.get("creditsConsumed"))
    return salvos


def registrar(task_id, nome, arquivos, creditos):
    with open(PASTA_VIDEOS / "historico.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps({"quando": datetime.now().isoformat(timespec="seconds"), "taskId": task_id,
                            "nome": nome, "arquivos": [str(a) for a in arquivos],
                            "creditos": creditos}, ensure_ascii=False) + "\n")


def cmd_gerar(a):
    prompt = ler_prompt(a.prompt)
    if not prompt:
        erro("Prompt vazio.")
    if a.rascunho and a.resolucao != "480p":
        print("ℹ️  Rascunho só existe em 480p; usando 480p.")
        a.resolucao = "480p"
    refs = [resolver_ref(r) for r in (a.ref or [])]
    audios = [resolver_audio(r) for r in (a.ref_audio or [])]
    if a.primeiro_quadro and (refs or audios):
        erro("Use --ref/--ref-audio OU --primeiro-quadro, não os dois (regra do Seedance).")
    if audios and not a.audio:
        print("ℹ️  Com voz de referência, o áudio precisa ser gerado; ligando --audio.")
        a.audio = True

    creditos = CREDITOS_POR_SEGUNDO[a.resolucao] * a.duracao
    dolares = DOLAR_POR_SEGUNDO[a.resolucao] * a.duracao
    nome = a.nome or f"veeem-{datetime.now():%Y%m%d-%H%M%S}"

    print("📋 Pedido")
    print(f"   Modelo:     Seedance 2.5{' (rascunho)' if a.rascunho else ''}")
    print(f"   Resolução:  {a.resolucao}   Formato: {a.formato}   Duração: {a.duracao}s")
    print(f"   Áudio:      {'sim' if a.audio else 'não'}")
    print(f"   Referências: {len(refs)} imagem(ns), {len(audios)} áudio(s)"
          + (" + primeiro quadro" if a.primeiro_quadro else ""))
    print(f"   Prompt:     {prompt[:140]}{'...' if len(prompt) > 140 else ''}")
    print(f"   Custo estimado: ~{creditos} créditos (~US$ {dolares:.2f}) — preço beta, pode variar")

    if not a.confirmar:
        print("\n🛑 Nada foi enviado nem gasto. Para gerar de verdade, rode de novo com --confirmar")
        return

    chave = carregar_chave()
    s = saldo(chave)
    print(f"\n💰 Saldo atual: {s} créditos")
    if s < creditos:
        erro(f"Saldo ({s}) menor que o estimado ({creditos}). Recarregue no kie.ai.")

    entrada = {"prompt": prompt, "resolution": a.resolucao, "aspect_ratio": a.formato,
               "duration": a.duracao, "generate_audio": a.audio, "output_format": "mp4"}
    if a.rascunho:
        entrada["draft"] = True
    if refs:
        print("⬆️  Enviando imagens de referência (ficam no KIE por 24h)...")
        entrada["reference_image_urls"] = [r if isinstance(r, str) else enviar_arquivo(r, chave) for r in refs]
    if audios:
        print("⬆️  Enviando áudio de referência (fica no KIE por 24h)...")
        entrada["reference_audio_urls"] = [r if isinstance(r, str) else enviar_arquivo(r, chave) for r in audios]
    if a.primeiro_quadro:
        pq = resolver_ref(a.primeiro_quadro)
        entrada["first_frame_url"] = pq if isinstance(pq, str) else enviar_arquivo(pq, chave)

    resp = chamar("POST", f"{API}/api/v1/jobs/createTask", chave, {"model": MODELO, "input": entrada})
    acompanhar(chave, resp["data"]["taskId"], nome)


def main():
    p = argparse.ArgumentParser(description="Gera vídeos do Veeem no Seedance 2.5 (KIE).")
    sub = p.add_subparsers(dest="comando", required=True)

    sub.add_parser("saldo", help="Mostra os créditos da conta (não gasta nada).")

    g = sub.add_parser("gerar", help="Gera um vídeo.")
    g.add_argument("--prompt", required=True, help="Texto do prompt ou caminho de um .txt")
    g.add_argument("--ref", action="append", help="Imagem de referência (repita até 30x)")
    g.add_argument("--ref-audio", action="append", help="Áudio de referência de voz (wav/mp3, 2 a 30s)")
    g.add_argument("--primeiro-quadro", help="Imagem que vira o 1º quadro (não combina com --ref)")
    g.add_argument("--resolucao", choices=["480p", "720p", "1080p"], default="480p")
    g.add_argument("--formato", choices=["9:16", "16:9", "1:1", "4:3", "3:4", "21:9", "adaptive"], default="9:16")
    g.add_argument("--duracao", type=int, default=8, help="4 a 30 segundos (padrão 8)")
    g.add_argument("--audio", action="store_true", help="Gera áudio junto (padrão: sem áudio)")
    g.add_argument("--rascunho", action="store_true", help="Modo rascunho (só 480p, para testar)")
    g.add_argument("--nome", help="Nome do arquivo final (sem extensão)")
    g.add_argument("--confirmar", action="store_true", help="Sem isso, só mostra o custo e não gasta nada")

    st = sub.add_parser("status", help="Acompanha/baixa um vídeo já pedido.")
    st.add_argument("task_id")
    st.add_argument("--nome")

    a = p.parse_args()
    if a.comando == "saldo":
        print(f"💰 Saldo: {saldo(carregar_chave())} créditos")
    elif a.comando == "gerar":
        if not 4 <= a.duracao <= 30:
            erro("Duração precisa ser de 4 a 30 segundos.")
        cmd_gerar(a)
    elif a.comando == "status":
        acompanhar(carregar_chave(), a.task_id, a.nome or f"veeem-{a.task_id[-8:]}")


if __name__ == "__main__":
    main()
