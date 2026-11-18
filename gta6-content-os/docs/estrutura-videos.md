# Estrutura de vídeos — O Canal do GTA 6 (@ocanaldogta6)

Mapa completo de como o canal **cria**, **clipa** e **organiza** vídeos: o que existe, onde fica, como rodar e quais regras o código impõe.
Estado em 18/11/2026. Pendências do dia a dia: `docs/pendencias.md`.

---

## 1. Visão geral

São três tipos de vídeo, que passam pela mesma esteira de qualidade:

| Fluxo | O que é | Entrada | Template | Estado |
|---|---|---|---|---|
| **A — Original narrado** | Short (9:16) ou longo (16:9) com roteiro próprio, narração da Thalita e motion do canal | roteiro + storyboard | `ShortVideo` / `LongVideo` | funcional; 17 Shorts e 2 longos roteirizados |
| **B — Corte narrado** | Trecho de vídeo autorizado (ex.: trailer oficial) de fundo, com narração e contexto nossos | roteiro + storyboard com `video` | `ShortVideo` com `bgVideo` | funcional (c01, Trailer 2) |
| **C — Corte de live** | Streamer em cima e jogo embaixo, com gancho, legenda com pop, zoom nos picos, emojis e SFX | VOD **autorizado** + manifesto | `LiveCut` | testado só com filme CC; falta live autorizada |

O fluxo C não monetiza sozinho. A política de "conteúdo reutilizado" do YouTube exige narração ou comentário próprio, mesmo com autorização do criador. Para monetizar, o corte de live precisa ganhar narração, como no fluxo B. Veja a seção 9.

```
 radar de fontes oficiais ─► pautas/fila ─► ROTEIRO ─► Gate 1 (fatos) ─► Gate 2 (criatividade)
                                               │
                    storyboard (layout por beat, imagens/vídeo, selo, fonte)
                                               ▼
        voz Thalita por beat (cache) ─► voice QA ─► Remotion ─► loudnorm ─► MP4
                                               ▲
 VOD autorizado ─► clipper.py (transcrição + sinais) ─► candidatos ─► livecut_prep ─► LiveCut
                                               ▼
                 Gate 3 (audiovisual) ─► SEO + capas ─► aprovação humana ─► Gate 4 ─► YouTube (privado/agendado)
```

---

## 2. Mapa de pastas

```
gta6-content-os/
├─ content/
│  ├─ radar-AAAA-MM-DD.{json,md}     notícias oficiais coletadas (evidência literal)
│  ├─ pautas/                        pautas priorizadas + fila.md
│  ├─ calendario-30-dias.{json,md}
│  ├─ roteiros/<id>.json             ROTEIRO (fala, texto na tela, citações)
│  ├─ storyboards/<id>.json          STORYBOARD (layout, imagem/vídeo, selo, fonte por beat)
│  └─ seo/<id>.md, <id>-thumbs.json  título, descrição, tags, capas
├─ rights/<ativo>.json               MANIFESTO DE DIREITOS (sem ele nada renderiza)
├─ media/oficial/                    kit de mídia da Rockstar (fora do git)
├─ studio/                           Remotion (motion)
│  ├─ src/ShortVideo.tsx             template 9:16 (fluxos A e B)
│  ├─ src/LongVideo.tsx              template 16:9
│  ├─ src/LiveCut.tsx                template de corte de live (fluxo C)
│  ├─ src/Thumb.tsx, ChannelArt.tsx  capas 1280×720, avatar e banner
│  ├─ src/brand.ts                   cores, fontes, selos, estilo "adesivo"
│  └─ public/                        fontes OFL, sfx/ gerados, mídia temporária do render
├─ clip-engine/                      Python
│  ├─ clipper.py                     motor de clipping (analyze/render)
│  ├─ livecut_prep.py                prepara as props do LiveCut a partir da análise
│  ├─ sfx.py                         efeitos sonoros sintetizados por nós
│  ├─ tts.py                         voz Thalita (azure = produção, edge = prévia)
│  ├─ voice_qa.py, asr_check.py      confere a pronúncia pela transcrição da fala gerada
│  └─ lang_check.py
├─ src/                              TypeScript (orquestração)
│  ├─ cli.ts                         comandos npm
│  ├─ gates/gates.ts                 os 4 gates
│  ├─ modules/f-production/short.ts  produção (voz → timeline → render)
│  ├─ modules/g-seo/seo.ts           metadados
│  └─ modules/h-publishing/youtube.ts upload com travas
├─ scripts/
│  ├─ corte-live.ts                  fluxo C de ponta a ponta
│  ├─ render-thumbs.ts               capas
│  └─ render-canal.ts                avatar/banner
├─ memory/                           identidade editorial, léxico de pronúncia, nomes próprios
├─ .claude/skills/                   skills de roteiro, checagem, pesquisa e YouTube (yt-*)
├─ entregas/                         saídas para revisão/postagem (MP4 não versionado)
└─ data/gta-os.sqlite                versões, aprovações, ledger de publicação e quota
```

---

## 3. Fluxo A — vídeo original narrado (Short e longo)

### 3.1 Passo a passo

```bash
npm run pipeline                      # radar → pautas → calendário → fact-check → painel
```
Depois escreva `content/roteiros/<id>.json` (skill `gta-scriptwriter`) e `content/storyboards/<id>.json`. Então:
```bash
npm run factcheck                     # Gates 1 e 2 de todos os roteiros, sem renderizar
```
```bash
npm run render:short -- <id>          # voz + render; vale para Short e longo (format do roteiro)
```
```bash
npm run gates -- <id>                 # Gates 1 a 4 do vídeo (o 3 só depois do render)
```
```bash
npm run review                        # entregas/painel-revisao.html
```
```bash
GTA_OS_REVIEWER="Brunella" npm run approve -- render <id>-v<versão>
```
```bash
npm run publish -- <id>               # dry-run; com --real envia como PRIVADO
```

### 3.2 Roteiro (`content/roteiros/<id>.json`)

O schema zod está em `src/core/content.ts`.

| Campo | Uso |
|---|---|
| `id`, `pautaId`, `format` (`short`/`longo`), `style` | identificação |
| `title`, `audience`, `goal`, `promise`, `hook`, `cta` | estratégia (o título nunca promete o que o vídeo não mostra) |
| `beats[]` | `narration` (fala), `onScreen` (texto na tela), `visual`, `edit`, `animation`, `audio` |
| `claims[]` | `text` + `newsIds` + `quote` **literal** da fonte; selo opcional (TERCEIROS/RUMOR/TEORIA/OPINIAO) |
| `sources[]` | aparecem na descrição automaticamente |

Regras de escrita (identidade + Gate 2): um fato por frase, frases curtas, gancho com até 18 palavras, primeiro beat do Short com até 25 palavras (cerca de 3 s), CTA obrigatório, 2,0 a 3,8 palavras/s, sem clichês proibidos ("prepare-se", "não perca", "insano"…). A referência de estrutura é o canal JTM (`docs/referencia-jtm.md`): **histórias e experiência valem mais que ficha técnica**, segunda pessoa e fonte falada na hora.

### 3.3 Storyboard (`content/storyboards/<id>.json`)

```json
{
  "scriptId": "s05-jason",
  "voice": "thalita",
  "emphasis": ["Jason"],
  "video": { "file": "...", "rights": "...", "start": 6.0, "credit": "..." },
  "beats": [
    { "layout": { "kind": "story", "text": "ELE SÓ QUER PAZ" },
      "bg": { "file": "media/oficial/...jpg", "rights": "rockstar-kit-midia.json", "position": "45% 50%" },
      "sourceLabel": "ROCKSTARGAMES.COM/VI · ONLY IN LEONIDA",
      "seal": "CONFIRMADO" }
  ]
}
```
Há um beat de storyboard para cada beat do roteiro. O campo `video` é opcional e transforma o vídeo em corte narrado (fluxo B). `emphasis` lista as palavras que a legenda destaca.

**Layouts disponíveis** (`studio/src/types.ts`):

| `kind` | Para quê |
|---|---|
| `bigNumber` | número real com medidor (ex.: 212 GB). Mostra o valor desde o 1º quadro, sem contagem |
| `quote` | citação literal com destaque e tradução |
| `tags` | lista de etiquetas com contador |
| `date` | data e contagem regressiva |
| `poll` | "isso ou aquilo" |
| `title` | título e subtítulo |
| `story` | frase curta grande sobre imagem (série de personagens/lugares) |
| `chapter` | abertura de capítulo (vídeo longo) |
| `map` | mapa de Leonida |

### 3.4 Produção (`src/modules/f-production/short.ts`)

1. **Voz por beat:** Thalita (`pt-BR-ThalitaMultilingualNeural`), ritmo padrão **+20% e +10 Hz** ("voz B"), configurável por `GTA_OS_VOICE_RATE` e `GTA_OS_VOICE_PITCH`.
   - `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` presentes → voz de **produção** (Azure F0, grátis e comercial).
   - Sem as chaves → voz de **prévia** (Edge). O Gate 4 bloqueia a publicação.
   - **Cache** por hash do texto + voz: corrigir uma frase re-sintetiza só aquele beat.
2. **Voice QA:** o `voice_qa.py` transcreve a fala gerada e exige que cada palavra comum seja reconhecida. Isso pega troca de sotaque (ex.: "vazamento" lido como "basamento"). Léxico em `memory/lexico-pronuncia.json` e `gatilhos-pronuncia.json`.
3. **Timeline:** respiro de 7 quadros entre falas e 30 quadros no fim (loop), a 30 fps.
4. **Legenda:** 1 a 3 palavras por vez, sincronizadas pelo tempo de cada palavra quando ele existe. As palavras de `emphasis` saem destacadas.
5. **Fundo:** imagens do kit oficial com zoom lento e tinta de pôr do sol por cima, ou trecho de vídeo mudo (fluxo B). Crédito na tela é automático.
6. **Trilha:** cama procedural gerada no ffmpeg, sem música de terceiros.
7. **Render:** Remotion (`Short` 1080×1920 ou `Long` 1920×1080), depois `loudnorm` (-14 LUFS, TP -1,5), AAC 192k e `+faststart`.

### 3.5 Identidade visual (`studio/src/brand.ts`, `memory/identidade-editorial.md`)

- **Tema "Pôr do sol de Leonida":** degradê roxo `#5B4A86` → malva → rosa `#DE8F95` → laranja `#F4A274`; tinta/contorno `#1E0F2E`; acentos rosa-neon `#FF4FA3`, sol `#FFD36B` e água `#3FD6E0`.
- **Fontes OFL embutidas:** Bowlby One (títulos/números), Yellowtail (detalhe neon, nunca para informação), Inter (texto), JetBrains Mono (fonte/data no rodapé).
- **Estilo adesivo:** texto branco com contorno grosso e sombra deslocada; cartões com borda e leve rotação.
- **Selos fixos:** CONFIRMADO (verde), TERCEIROS (ciano), RUMOR (vermelho), TEORIA (roxo), OPINIÃO (amarelo).
- **Sem marcas da Rockstar** como identidade própria: nada de logo "VI", letreiro ou R★ em avatar, banner ou vinheta.
- **Movimento:** sem zoom/shake em toda frase. Os selos "carimbam" e as palmeiras balançam devagar.

---

## 4. Fluxo B — corte narrado (trailer ou vídeo autorizado)

É o mesmo comando do fluxo A. A diferença é que o storyboard tem o bloco `video`:
- o trecho (`file`, `start`) vira fundo **mudo** do Short inteiro, e o áudio original é descartado;
- a narração da Thalita dá contexto antes, mostra o momento e comenta depois (é isso que torna o vídeo monetizável);
- `credit` fica sempre na tela (ex.: "IMAGEM: ROCKSTAR GAMES · TRAILER 2 OFICIAL").

Exemplo pronto: `c01-trailer2-jason-keys` (roteiro, storyboard e SEO).

---

## 5. Fluxo C — corte de live (streamer em cima, jogo embaixo)

### 5.1 Comando

```bash
npx tsx scripts/corte-live.ts <video> <rights.json> --game x,y,w,h --cam x,y,w,h --streamer @canal --credit "CORTE AUTORIZADO · LIVE DE 18/11" --top 3 --lang pt
```
- `--game` e `--cam` são retângulos **em pixels da fonte**. A facecam é fixa por streamer: guarde as coordenadas junto do manifesto. Sem `--cam`, o corte usa só o jogo.
- `--hooks hooks.json` (opcional) recebe `{ "<id do candidato>": "TEXTO DO GANCHO" }` e substitui o gancho automático.
- Saída: `entregas/cortes-live/<nome>-<id>.mp4` mais o `.json` com o motivo da escolha e a transcrição, para revisão humana.

### 5.2 O que acontece por dentro

1. **`clipper.py analyze`**: recusa o vídeo sem manifesto com direito `PROPRIO`, `LICENCA_ABERTA` ou `AUTORIZADO_POR_ESCRITO`. Depois:
   - transcreve com faster-whisper local, guardando o tempo de cada palavra;
   - calcula energia de áudio (janelas de 0,5 s) e mudanças de cena (ffmpeg);
   - procura reações na fala ("nossa", "corre", "mano", "!") e risos ("kkk", "haha");
   - monta candidatos de 18 a 45 s **alinhados a frases** (nunca corta no meio da fala), com 0,3 s de respiro antes e 0,6 s depois;
   - dá a nota final = 0,6 × editorial (gancho nos 3 primeiros segundos, reações, risos, cobertura de fala) + 0,4 × técnica (pico de áudio, variação, ritmo de cortes, confiança do ASR);
   - penaliza quando o pico cai logo no início, porque o setup provavelmente ficou de fora;
   - escolhe os melhores sem sobreposição.
   Cada etapa grava um artefato (`ingest.json`, `transcript.json`, `scenes.json`, `candidates.json`, `energy.npy`).
2. **`sfx.py`**: gera `whoosh`, `pop`, `shutter`, `ding` e `impact` sintetizados por nós. Não usa amostras de terceiros, então não há risco de Content ID. O `impact` substitui o meme "faah".
3. **`livecut_prep.py`**, para cada candidato:
   - recorta o trecho com o áudio da live;
   - monta a legenda com 1 a 3 palavras e até cerca de 14 caracteres por vez; palavra de função ("de", "que") não fica sozinha no fim; exclamações ficam em destaque amarelo;
   - marca até 4 **picos** (energia ≥ 2,2σ, com pelo menos 2,5 s de distância entre eles), onde entram zoom e whoosh;
   - coloca até 3 **emojis**: 😂 em riso e 😱 em susto perto de um pico;
   - escreve o **gancho** com a primeira frase do próprio corte, até 38 caracteres, ou o texto de `--hooks`.
4. **`LiveCut.tsx`** (1080×1920) renderiza; depois o ffmpeg aplica `loudnorm` (-14 LUFS).

### 5.3 Layout do `LiveCut`

| Elemento | Especificação atual |
|---|---|
| Streamer (topo) | 0–760 px (≈40% da altura), recorte "cover" da facecam |
| Jogo (base) | 760–1920 px (≈60%) |
| Divisória | faixa de 10 px em degradê rosa → sol → água |
| Topo fixo | "★ O CANAL DO GTA 6" (adesivo) à esquerda e "🎮 @streamer" à direita |
| Gancho | 0–3 s, cartão amarelo-sol com borda escura, entrada com mola (escala 0,6 → 1) e rotação de -2° |
| Legenda | na linha de divisão; Bowlby 80 px (92 px no destaque); pop de escala 0,7 → 1 |
| Zoom nos picos | soco de +14% na facecam com mola de cerca de 1 s; o jogo acompanha 30% disso; shake de 5 quadros |
| Emojis | 130 px à direita, sobem e somem em 1,2 s, com leve rotação alternada |
| Crédito | mono, 22 px, acima do rodapé, sempre visível |
| Entrada | flash branco de 4 quadros |
| Final | cartão rosa "SEGUE PRA MAIS CORTES" no último 1,6 s |
| Sons | shutter (0 s), impact (2º quadro), whoosh 6 quadros antes de cada pico, pop em cada emoji, ding no cartão final |

> **Ajuste pendente:** o formato ainda vai ser comparado com o vídeo de referência (youtube.com/watch?v=cksCVmaX1qM, tutorial do Davi Xavier) quando o Gemini voltar a ter cota. Nada foi alterado ainda por causa dele.

### 5.4 O que falta no fluxo C

- **Lives autorizadas** por escrito. Crédito não é autorização (regra da Brunella).
- **Coordenadas da facecam** de cada streamer.
- **Sinal de chat:** só é legível ao vivo, então precisa ser gravado durante a live. "Mais repetidos" não existe na API.
- **Narração** sobre o corte, para monetizar.
- Detector de eventos visuais do jogo (HUD, perseguição, morte) para gameplay sem fala.

### 5.5 Presets antigos do `clipper.py render` (sem Remotion)

Servem para render rápido em ffmpeg, com legenda `.ass` e gancho de 2,5 s:
- `gameplay_fit`: quadro inteiro no centro (preserva HUD e minimapa) sobre fundo desfocado do próprio vídeo;
- `center_crop`: corte central (uma pessoa falando);
- `split_cam`: facecam em cima (700 px) e jogo embaixo (1220 px).

Cada corte sai com `.srt`, `.ass`, `cutlist.json` e o comando ffmpeg reproduzível ao lado.

---

## 6. Gates de qualidade (`src/gates/gates.ts`)

Os gates automáticos são condição **necessária**. A aprovação humana é condição **suficiente**.

| Gate | Confere |
|---|---|
| **1 — Fatos** | cada afirmação tem fonte no radar com citação **literal** verificada há menos de 72 h; todo número e toda data na tela têm citação; o roteiro lista fontes |
| **2 — Criatividade** | sem clichês nem gatilhos de troca de idioma; gancho ≤ 18 palavras; 1º beat do Short ≤ 25 palavras; CTA; frases curtas; Short entre 15 e 59 s; ritmo de 2,0 a 3,8 palavras/s |
| **3 — Audiovisual** | 9:16 e ≥ 1080×1920 e ≤ 60 s (Short), ou 16:9 (longo); fps ≥ 24; tem áudio; loudness entre -16 e -12 LUFS; true peak ≤ -1 dBFS; WER da voz |
| **4 — Publicação** | voz licenciada (não prévia); gates 1 a 3 aprovados; direito de todos os ativos; material oficial com autorização, crédito e uso não comercial (bloqueia se `GTA_OS_CHANNEL_MONETIZED=true` sem licença comercial); spoiler sinalizado; título sustentado; **aprovação humana da versão atual** |

Cada render gera uma nova versão. Editar qualquer coisa invalida a aprovação anterior.

---

## 7. Direitos (`rights/<ativo>.json`)

```json
{
  "assetId": "...", "owner": "...",
  "rights": "PROPRIO | LICENCA_ABERTA | AUTORIZADO_POR_ESCRITO | MATERIAL_OFICIAL_DIVULGACAO",
  "publishable": true,
  "authorization": { "by": "...", "at": "AAAA-MM-DD", "scope": "plataforma, monetização, prazo" },
  "conditions": { "creditOnScreen": "...", "nonCommercialOnly": true, "noSpoilers": true },
  "commercialLicense": null,
  "proofUrl": "...", "notes": "..."
}
```
- `publishable:false` bloqueia a publicação (ex.: `tears-of-steel-720p.json`, que só serve de teste).
- Kit oficial da Rockstar (`rockstar-kit-midia.json`): autorizado pela Brunella em 17/11, com crédito "IMAGEM: ROCKSTAR GAMES", **uso não comercial**, sem spoiler.
- Streamers: o manifesto guarda o link ou e-mail da autorização, o formato de crédito, se permite monetizar, o repasse, os temas proibidos e a data. Modelos de pedido estão em `docs/pedidos-autorizacao.md`; a pesquisa de quem autoriza, em `docs/pesquisa-streamers-cortes.md`. Campanhas Viewx são temporárias e não valem como autorização permanente.

---

## 8. SEO, capas e publicação

- **Metadados** (`src/modules/g-seo/seo.ts` → `content/seo/<id>.md`): título com até 70 caracteres, tirado do roteiro; descrição com promessa, fontes e aviso de canal de fã; tags; categoria Jogos (20); capítulos do longo a partir da montagem real.
- **Capas** (`content/seo/<id>-thumbs.json` → `npx tsx scripts/render-thumbs.ts <id>`): 1280×720 no template `Thumb`. A capa mostra só o que existe no vídeo; nunca imagem gerada por IA.
- **Canal:** `docs/canal-config.md` (descrição, playlists, envios padrão, palavras-chave) e `entregas/canal/` (avatar, banner, marca-d'água).
- **Upload** (`src/modules/h-publishing/youtube.ts`), com travas nesta ordem:
  1. aprovação da versão;
  2. gates aprovados;
  3. ledger anti-duplicata por hash do MP4;
  4. quota (upload = 1.600 de 10.000 por dia, ou seja, cerca de 6 por dia);
  5. dry-run por padrão.

  Sempre sobe **privado** e agendado. O envio real nunca foi executado porque falta o OAuth.
- **Agenda:** `docs/agenda-publicacao.md`, com Shorts às 12h e 19h (Brasília).

### Playlists (organização no canal)
Notícias oficiais · Personagens de GTA 6 · Lugares de Leonida · Cortes narrados dos trailers · Gameplay e guias.

### Convenção de IDs
`s##-tema` = Short · `l##-tema` = longo · `c##-tema` = corte narrado · `<fonte>-c###` = corte de live (id do candidato).

---

## 9. Regras que sustentam o canal

1. **Só corta quem autoriza.** Crédito não é autorização. Sem manifesto, o motor recusa.
2. **Monetização exige narração/comentário próprio** (política de conteúdo reutilizado do YouTube, que vale mesmo com permissão do criador). Corte cru não monetiza.
3. **Material oficial da Rockstar é só para uso não comercial.** Antes de monetizar: pedir licença à Take-Two (copyright@take2games.com) ou trocar por gameplay próprio.
4. **Tudo é checado:** fato com fonte, boato com selo, vazamento não entra.
5. **Nada é publicado sem aprovação humana da versão atual.**
6. **Serviços pagos só com opt-in** (`GTA_OS_ALLOW_PAID`); credenciais só por variável de ambiente.
7. **Sinal indisponível é registrado como indisponível**, nunca simulado (chat, "mais repetidos", LLM).

---

## 10. Inventário atual

| Tipo | IDs |
|---|---|
| Shorts de notícia | s01 (três números), s02 (Xbox One), s03 (Festival Miami), s07 (Nova Zelândia) |
| Série personagens | s04 Lucia, s05 Jason · Boobie · Dre'Quan · Real Dimez · Raul · Brian |
| Série lugares | s06 Vice City · Keys · Grassrivers · Port Gellhorn · Ambrosia · Kalaga |
| Longos | l01 (tudo confirmado), l02 (quem é quem — **publicado**) |
| Corte narrado | c01 (Trailer 2, Jason nas Keys) |
| Corte de live | só o teste com Tears of Steel (não publicável) |

---

## 11. Próximas fases (vídeo)

- **Voz de produção:** configurar `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`. Hoje tudo sai com voz de prévia.
- **Gameplay próprio** (a partir de 19/11): vira fonte dos fluxos B e C sem depender de ninguém. O preset `gameplay_fit` já serve.
- **Automação de 10 Shorts/dia:** tarefa agendada diária. Depende de gameplay próprio ou lives autorizadas e da voz Azure.
- **Cortes dos nossos longos:** cada longo vira de 3 a 6 Shorts pelo motor de clipping, sem precisar de autorização.
- **Clipping:** detector de eventos visuais do jogo, reframe com tracking, gravação de chat das lives, buffer circular para live em tempo real e scoring semântico por LLM (provedor ainda não escolhido).
- **Motion:** comparador, mapa animado, lower third e mais layouts.
- **Fase 5:** retenção (`audienceWatchRatio`) e relatórios de 24 h, 72 h, 7 dias e 28 dias, que alimentam a memória criativa.
- **Skills a criar** depois de validar o processo: gta-clipping, gta-motion, gta-quality-review, gta-youtube-seo.
