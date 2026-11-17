#!/usr/bin/env bash
# Instala o rea-video (JuneYaooo/rea-video, Apache-2.0) fixado num commit auditado, em venv isolado.
# Auditoria (17/11/2026): executa só ffmpeg/ffprobe/navegador; baixa modelos ONNX de releases do GitHub com SHA-256;
# VLM externo é OPCIONAL e fica desligado (o Claude revisa os quadros). Extra [asr] NÃO instalado: SenseVoice não suporta pt-BR.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMMIT=07dd587
DIR="$ROOT/tools/rea-video"
[ -d "$DIR/.git" ] || git clone -q https://github.com/JuneYaooo/rea-video.git "$DIR"
git -C "$DIR" fetch -q --depth 50 origin && git -C "$DIR" checkout -q "$COMMIT"
uv venv -q -p python3.12 "$DIR/.venv"
VIRTUAL_ENV="$DIR/.venv" uv pip install -q -e "$DIR[ocr]"
# rapidocr-onnxruntime traz opencv-python, que conflita com o headless (mesma correção do install_skill.sh oficial)
VIRTUAL_ENV="$DIR/.venv" uv pip uninstall -q opencv-python || true
VIRTUAL_ENV="$DIR/.venv" uv pip install -q --reinstall --no-deps "opencv-python-headless>=4.8,<5"
mkdir -p "$HOME/.local/bin" && ln -sfn "$DIR/.venv/bin/rea-video" "$HOME/.local/bin/rea-video"
# skill versionada no projeto (instruções + referências)
rm -rf "$ROOT/.claude/skills/rea-video" && cp -r "$DIR/skills/rea-video" "$ROOT/.claude/skills/rea-video"
cp "$DIR/LICENSE" "$ROOT/.claude/skills/_vendor/rea-video.LICENSE"; cp "$DIR/NOTICE" "$ROOT/.claude/skills/_vendor/rea-video.NOTICE"
echo "rea-video @ $COMMIT (Apache-2.0) — instalado em $(date -I)" > "$ROOT/.claude/skills/_vendor/rea-video.SOURCE"
"$HOME/.local/bin/rea-video" --help | head -5
