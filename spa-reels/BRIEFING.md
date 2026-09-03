# BRIEFING · modo "Destinos" no reel de roteiro (referência: piloto Portugal)

Enviado do Mac da Brunella em 06/11/2026. Ela aprovou o **visual** deste piloto em 05/11 e quer que a série
"Destinos" passe a ser feita 100% na VPS, dentro da máquina de conteúdo que já existe. Esta pasta é só **referência**:
não roda nada sozinha, não está no git e não deve virar um segundo pipeline.

- Vídeo aprovado: `out/spa-portugal-piloto.mp4` (1080x1920, 30 fps, ~70 s, -14 LUFS)
- Legenda do post: `legenda-portugal.md`
- Origem: inspirado no reel do @the.baldrhino sobre Minas Gerais (mapa de satélite + narração + curiosidades)

## O que fazer

Criar o **modo Destinos** dentro de `projetos/modelos-ofertas/scripts/reel_roteiro.py` + `roteiro_mapa.mjs`
(o reel de roteiro com mapa de 03–06/11), reaproveitando o que já existe lá: voz Adam (Fish Audio), transcrição com
tempo por palavra, Playwright quadro a quadro, fontes, logo, fila de publicação (reel sempre MANUAL).
**Não** portar o Remotion desta pasta: ele é só a referência de como cada efeito ficou. Ler `src/Portugal.tsx`,
`src/ui.tsx` e `src/geo.ts` para copiar a lógica, não o código inteiro.

Antes de mexer, fazer cópia `.antes-AAAA-MM-DD-destinos` dos arquivos alterados (padrão da pasta). Gerar o Portugal de
novo pelo modo novo como 1º teste, para a Brunella comparar com o piloto.

## O que o piloto traz e o reel de roteiro ainda não tem

1. **Satélite nítido em vários níveis de zoom.** `scripts/build_map.py` costura tiles EOX Sentinel-2 cloudless 2016
   (CC BY 4.0, `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg`), em 3 camadas
   (mundo z5, Península Ibérica z7, Portugal z10), escurece e aumenta o contraste. Projeção Web Mercator. As camadas
   trocam por crossfade conforme o zoom da câmera. O NASA Blue Marble atual fica borrado em zoom de cidade.
   Pedir só os tiles da caixa necessária e ter cache local (não bater no servidor da EOX a cada render).
2. **Câmera por keyframes** `(lon, lat, zoom)` com zoom interpolado em escala log e easeInOutCubic, mais um peso no
   centro para o destino não "fugir" da tela no zoom (`cameraAt` em `src/geo.ts`).
3. **Comparação de tamanho em escala real**: o contorno de Pernambuco desenhado por cima de Portugal, mantendo km
   (deslocamento equiretangular com correção de latitude, em `build_map.py`). Serve para qualquer destino ("X cabe em Y").
   Contornos: Natural Earth 50m/10m e geojson de estados do Brasil. O Douglas-Peucker tem que simplificar cada anel
   fechado em duas metades, senão ele zera o polígono.
4. **Rota animada** em arco (bezier quadrático) com avião: SP → Lisboa em turquesa, e Lisboa → Rio para a história de 1808.
5. **Cartão de número que sobe** (1808 → "13 anos", 24,38 m, 1290, 1756), com fonte embaixo (IBGE, INE, Guinness, UNESCO).
6. **Cartão de foto com borda branca e linha** apontando o ponto no mapa (fotos do Wikimedia Commons, crédito no rodapé
   e na legenda; ver `scripts/baixa_fotos.py` e `src/data/creditos.json`).
7. **Pino pulsando** no lugar citado e contorno com brilho (blur) no país.
8. **Legenda com palavra-chave destacada**: no roteiro, `**destaque**`; o bloco entra no tempo da palavra dita.
   Número por extenso na `fala` e em algarismos na legenda (`src/data/roteiro.json`).

Estrutura do roteiro: 10 trechos (gancho, voo, corte, nata, roca, nazare, coimbra, douro, fecho, cta). O gancho é a
comparação de tamanho. Cada lugar ganha um zoom, uma foto, um fato com número e fonte.

## O que NÃO copiar do piloto (fura `projetos/MARCA.md`)

| No piloto | Na VPS vale |
|---|---|
| Azul `#00AEEF` / `#1B2A4A` | `#0EB3D8` / `#001A4D` |
| Destaque amarelo `#FFC94D` | **Sem amarelo** (14/10): acento turquesa |
| "SPA · Sua Passagem Aérea" digitado no canto | Logo oficial PNG (`projetos/marca/`), nunca texto |
| Só Inter | Poppins 800 nos títulos, Inter no texto |
| CTA "chama a SPA no direct" | "Fale com nossos agentes" no WhatsApp + link de reservas |
| Voz OpenAI "coral" | Adam (Fish Audio), escolhido em 05/11; OpenAI de reserva |

Manter: fato só com fonte (portão de fatos), crédito do mapa (EOX, contém dados Copernicus Sentinel) e das fotos,
áreas das barras do Instagram livres (topo ~250 px, rodapé ~420 px, direita ~120 px), loudnorm a -14 LUFS.

## Próximos destinos sugeridos

Chile, Japão, Orlando, Fernando de Noronha, Buenos Aires.

## Arquivos desta pasta

`src/Portugal.tsx` (cenas, tempos e câmera) · `src/ui.tsx` (cartões, legenda) · `src/geo.ts` (projeção, câmera, arcos) ·
`scripts/build_map.py` (satélite e contornos) · `scripts/tts.py` + `scripts/tempos.py` (voz e tempo das palavras) ·
`scripts/baixa_fotos.py` · `src/data/*.json` (roteiro, palavras, créditos, geo) · `public/` (mapas, fotos e áudio do piloto).
