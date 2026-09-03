# SPA Reels — série "Destinos" em mapa de satélite

Piloto: `out/spa-portugal-piloto.mp4` (1080x1920, ~70 s). Legenda do post em `legenda-portugal.md`.

## Como o vídeo é montado

| Parte | Onde fica |
|---|---|
| Roteiro (fala + blocos de legenda com **destaques**) | `src/data/roteiro.json` |
| Narração por trecho | `audio-src/<id>.mp3` (bruto) → `public/audio/<id>.wav` (tratado) |
| Tempo de cada palavra (sincroniza a legenda) | `src/data/palavras.json` |
| Mapa de satélite + contornos | `public/map/*.jpg`, `src/data/geo.json` |
| Fotos e créditos | `public/fotos/`, `src/data/creditos.json` |
| Câmera, cartões e cenas | `src/Portugal.tsx` |

## Passo a passo

1. Editar `src/data/roteiro.json` (números por extenso na `fala`, em algarismos nas `legendas`).
2. Gerar a voz: `python3 scripts/tts.py` (OpenAI TTS; precisa de `OPENAI_API_KEY`).
   - **Voz humana:** grave um arquivo por trecho com o mesmo nome em `audio-src/` (ex.: `gancho.mp3`) e rode o mesmo comando; ele só gera o que estiver faltando.
3. Marcar as palavras: `python3 scripts/tempos.py`.
4. Prévia interativa: `npm run studio`. Vídeo final: `npm run render`.

Para um novo destino: trocar a área do mapa em `scripts/build_map.py`, as fotos em `scripts/baixa_fotos.py` e as cenas em `src/Portugal.tsx`.

## Licenças

O mapa (EOX, CC BY 4.0) e as fotos (Wikimedia Commons) exigem crédito: já está no rodapé do vídeo e no fim da legenda.
