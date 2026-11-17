# Auditoria de ferramentas de clipping — GTA 6 Content OS

**Data da auditoria:** 2026-11-17
**Escopo:** escolher o motor de clipping (vídeo longo/live → Shorts/Reels/TikTok 9:16) para o pipeline de um canal brasileiro de GTA 6.
**Critérios:** controle local, saída editável, estabilidade, automação, nenhuma API paga obrigatória.

## Método e limites (leia antes)

- Repositórios foram clonados com `git clone --depth 1` em diretório temporário e **apenas lidos**. **Nenhum script, Docker, instalação ou teste foi executado.** Nada aqui foi "testado na prática".
- Como o clone é raso, a contagem de commits/histórico não foi verificada; "último commit" é a data do HEAD no momento do clone.
- Estrelas, downloads e popularidade vêm de buscas na web/agregadores e **não foram verificados** no GitHub.
- Nenhuma API paga ou chave foi usada.
- Legenda: **[verificado no código]** = li o arquivo; **[doc oficial]** = página oficial consultada; **[não verificado]** = vem de busca/agregador ou de conhecimento prévio.

---

## A) OpenShorts — https://github.com/mutonby/openshorts

| Item | Achado | Fonte |
|---|---|---|
| Licença | **MIT** (`LICENSE`: "MIT License, Copyright (c) 2024 OpenShorts"). **Exceção:** tudo em `cloud/` está sob a "OpenShorts Commercial License" (uso pessoal/interno, não MIT) — ver `NOTICE` e `cloud/LICENSE`. | [verificado no código] |
| Último commit | 2026-11-16 23:51 (+0100) — "feat(render): let a CPU-only host pick a faster libx264 preset" | [verificado no código] |
| Stack | Python (FastAPI + uvicorn) no backend (`app.py` ~460 KB, `main.py` ~146 KB); dashboard React/Vite em `dashboard/`; serviço de render Remotion (Node) em `render-service/` e `remotion/`; Alembic/DB; boto3 (S3 opcional). Dependências em `requirements.txt`: faster-whisper 1.2.1, scenedetect 0.7, transnetv2-pytorch, ultralytics 8.4.46 (YOLOv8), mediapipe 0.10.14, torch 2.11, yt-dlp, google-genai. | [verificado no código] |
| Como roda | **Docker Compose** é o caminho documentado (`docker-compose.yml`: backend :8000, frontend :5175, renderer :3100). Também existem: **REST API** (FastAPI, OpenAPI em `/docs`), **webhooks de conclusão**, **servidor MCP** (`mcp_server.py` via HTTP `/mcp` e `mcp_stdio.py` via stdio), **CLI** (`cli/openshorts_cli.py`, cliente da API) e **Agent Skill** compatível com Claude Code (`skills/openshorts/SKILL.md`). Atenção: a skill é um wrapper para a API/MCP (hosted por padrão, `OPENSHORTS_API_KEY`), não um pipeline local independente. Rodar sem Docker (venv puro) não é documentado como caminho principal — **não verificado**. | [verificado no código] |
| Transcrição | faster-whisper com timestamps por palavra (`transcribe_backends.py`); opcional Parakeet (ONNX, GPU) com fallback automático para whisper; falha CUDA tenta de novo em CPU. Modelo configurável via `WHISPER_MODEL` (ex.: `large-v3-turbo`). Tudo local. | [verificado no código] |
| Detecção de momentos | LLM sobre a **transcrição** + limites de cena (PySceneDetect). Padrão: **Google Gemini** (`GEMINI_MODEL`, default `gemini-3.1-flash-lite` em `main.py`). Alternativa: qualquer servidor OpenAI-compatível via `LLM_BASE_URL`/`LLM_MODEL` (Ollama, LM Studio, vLLM, llama.cpp) — `llm_backend.py`, default `llama3.1:8b`. | [verificado no código] |
| Exige API paga? | **Não para o núcleo de clipping**, desde que `LLM_BASE_URL` aponte para LLM local. Porém, ficam **dependentes de Gemini** (sem alternativa local): o seletor automático de layout (`layout_picker.py`), o detector de conteúdo de tela (`screencast_layout.py`) e o caminho de **vídeo sem fala** (`main.get_visual_clips`). Sem Gemini, layout cai para crop com face-tracking e vídeo silencioso **falha**. Dublagem (ElevenLabs), AI Shorts/UGC (fal.ai) e auto-post (Upload-Post) são opcionais e pagos/BYOK. | [verificado no código: docstring de `llm_backend.py` e README seção 6] |
| Reframe / face tracking | `reframe_v2.py`: análise em ≤640px + render nativo ffmpeg com crop dinâmico (`sendcmd`). Modos por cena: TRACK (MediaPipe + YOLOv8), GENERAL (fundo desfocado), SPLIT (dois falantes empilhados), SCREENCAST (tela + apresentador). `active_speaker.py`, `camera_inset.py`, `split_layout.py`. | [verificado no código] |
| Legendas | Arquivos `.ass` gerados e **queimados** no vídeo (`subtitles.py`, `burned_subtitles.py`); vários estilos; editor com cortes por palavra. | [verificado no código] |
| Formatos de saída | MP4 vertical 9:16 com legenda queimada + `<titulo>_metadata.json` (títulos, score de viralidade etc.). **Não encontrei exportação para NLE** (XML/FCPXML/EDL para Premiere/DaVinci) — busca por `fcpxml|edl|premiere` não achou nada relevante. Editabilidade = editor web próprio + re-render. | [verificado no código, busca por grep] |
| Sinal útil para gaming | `twitch_signals.py`: usa a Twitch Helix (Get Clips, `vod_offset`, `view_count`) para promover janelas de VOD que os próprios viewers clipparam — explicitamente pensado para gameplay ("a chase, a crash or a heist finale"). Requer `TWITCH_CLIENT_ID/SECRET` (gratuito). Nenhum uso de "Most replayed" do YouTube encontrado. | [verificado no código] |
| Sinais de maturidade | Commits diários recentes; ~138 arquivos em `tests/` (~1.880 funções `def test`); CI em `.github/workflows/ci.yml`; locks CPU/GPU; README extenso. | [verificado no código; não executei os testes] |

**Riscos do OpenShorts**
1. **Escopo inflado / modelo open-core:** o mesmo repo carrega SaaS (billing, autopilot, OAuth, metering em `cloud/` com licença comercial), UGC com atores de IA, YouTube Studio. Muita superfície para um uso que só precisa de clipping. Monólitos grandes (`app.py` ~460 KB) dificultam fork/manutenção.
2. **Detecção baseada em transcrição:** para GTA (gameplay com tiro, perseguição, explosão sem fala), o picker textual ranqueia mal; o caminho visual depende de Gemini. Precisaria complementar com energia de áudio/cena.
3. **Licença transitiva:** `ultralytics` (YOLOv8) é **AGPL-3.0** [conhecimento prévio, não verificado neste clone] — relevante se o pipeline for distribuído ou oferecido como serviço.
4. **Ritmo de mudança alto:** muitas mudanças por dia = risco de quebra; fixar commit/tag.
5. **Saída "fechada" em MP4 queimado** — sem projeto editável em NLE.
6. Repositório pesado (GIF de ~65 MB versionado na raiz).
7. Ponto de vazamento: se Gemini estiver configurado, a transcrição sai da máquina (o README diz que o vídeo não é enviado no caminho textual).

Arquivos lidos: `LICENSE`, `NOTICE`, `cloud/LICENSE` (início), `README.md`, `requirements.txt`, `docker-compose.yml`, `llm_backend.py` (início), `clip_selection.py` (grep), `transcribe_backends.py` (grep), `reframe_v2.py` (cabeçalho), `twitch_signals.py` (cabeçalho), `subtitles.py`/`main.py` (grep), `skills/openshorts/SKILL.md` (frontmatter), lista de `tests/` e `.github/workflows/`.

---

## B) "Claude Shorts"

**Candidato principal:** https://github.com/AgriciDaniel/claude-shorts (pouca ambiguidade; existe também `agricidaniel/claude-video`, do mesmo autor, citado em diretórios de skills — não verificado).

- **Licença:** MIT (Copyright 2026 Daniel Agrici) [verificado no código]
- **Último commit:** 2026-04-10 [verificado] — ~7 meses sem commits no HEAD.
- **O que faz:** Skill de Claude Code (`SKILL.md`, comando `/shorts`), pipeline interativo de 10 passos: preflight → transcrição faster-whisper → **o próprio Claude (a sessão do agente) pontua os segmentos** → usuário aprova → snap de bordas em pontos de corte de áudio (`snap_boundaries.py`) → reframe com MediaPipe/OpenCV (`compute_reframe.py`) → legendas animadas via **Remotion** → export ffmpeg por plataforma (`export.sh`). [verificado no código]
- **Local vs cloud:** processamento local; o "LLM" é a sessão Claude Code (consome sua assinatura/uso do Claude, não uma API key separada). Nenhuma chave de API encontrada nos scripts. [verificado por grep]
- **Chaves:** nenhuma obrigatória além do acesso ao Claude Code.
- **Maturidade:** projeto pequeno de autor único; estrelas ~120–170 segundo agregadores [não verificado]. `setup.sh`/`install.sh` instalam deps (não executados). Depende de Remotion (Node) — licença Remotion tem regras próprias para empresas [conhecimento prévio, não verificado].
- **Observação:** fluxo interativo (pede aprovação) — bom para qualidade, ruim para automação headless.

## C) "Clipify" — **AMBÍGUO**

Pelo menos três projetos diferentes com esse nome:

| Repo | Licença | Último commit | O que é | Local/cloud | Chaves |
|---|---|---|---|---|---|
| https://github.com/louisedesadeleer/clipify | MIT | 2026-08-24 | **Skill de Claude Code** (`/clipify`). Modo diálogo (Whisper local `tiny.en`/`base`) e **modo ação** (`detect_transients.py` detecta impactos sonoros — relevante para gameplay), reframe 9:16 por pan/split, legendas ASS estilo Opus (`build_ass.py`). | Local (ffmpeg, whisper, numpy) | Nenhuma encontrada por grep |
| https://github.com/adelelawady/Clipify | MIT | 2026-03-17 | Pacote Python (PyPI `clipify`) + UI desktop (gradio) + "Clipify-Hub" (servidor). Segmentação temática por IA. | Requirements incluem `openai` e `google-generativeai` → **provavelmente exige chave de API de nuvem** [não verificado em detalhe]; moviepy 1.0.3, openai-whisper. | Provável OpenAI/Gemini |
| https://github.com/GetRepliq/Clipify | **GPL-3.0** | 2024-08-25 | Script Python (MoviePy/OpenCV/Whisper), "alternativa ao OpusClip". | Local | não verificado |

Todos lidos só em README/SKILL.md/requirements. O mais alinhado ao caso (skill Claude Code, local, modo de impacto sonoro) é o de **louisedesadeleer**; o SKILL.md cita `-hwaccel videotoolbox` (macOS) — pode precisar ajuste em Linux/Windows.

## D) "video-use" — https://github.com/browser-use/video-use

- **Licença:** MIT (Copyright 2026 Browser Use) [verificado]
- **Último commit:** 2026-10-08 [verificado]
- **O que faz:** Skill para Claude Code/Codex: "solte footage numa pasta e converse" → `edit/final.mp4`. Corta fillers/silêncio, color grade, fades de 30 ms, legendas queimadas, overlays (Remotion/Manim/HyperFrames), memória de sessão em `project.md`. É um **editor conversacional**, não um clipador de momentos virais. [verificado no README]
- **Local vs cloud:** edição local (ffmpeg, librosa), mas a **transcrição usa ElevenLabs Scribe** (`helpers/transcribe.py`, `model_id: scribe_v1`, exige `ELEVENLABS_API_KEY` e aborta sem ela). [verificado no código]
- **Chaves:** **ElevenLabs obrigatória (paga/free tier)** → viola o critério "sem API paga obrigatória". Existe um fork "freecut" que troca por Whisper local [não verificado]. Forks homônimos: hydraxman/video-use, csoop/video-use, gregpr07/video-use [não verificados].
- **Maturidade:** org conhecida (browser-use); estrelas citadas entre ~9,5k e ~24k por agregadores [não verificado]; versão 0.1.0 no `pyproject.toml`.
- **Nota:** este audit **não usou** a `ELEVENLABS_API_KEY` presente no ambiente.

## E) Skill de FFmpeg para Claude Code

Não existe skill **oficial** do projeto FFmpeg nem da Anthropic identificada. Há várias skills comunitárias (todas [não verificadas], só vistas em agregadores): `einverne/dotfiles` (`claude/skills/ffmpeg`), `madappgang/claude-code` (`ffmpeg-core`), `digitalsamba/claude-code-video-toolkit` (`ffmpeg`), `majiayu000/claude-skill-registry` (`ffmpeg-media`), `oaustegard/claude-skills` (`processing-video`). Valor baixo: o Claude já domina ffmpeg; recomenda-se escrever uma skill **interna** curta com os presets do canal (9:16, loudnorm, legendas ASS, encoders) em vez de adotar uma de terceiros (que são instruções que o agente vai seguir — revisar antes).

## F) OpusClip (opus.pro) — referência de qualidade

Fonte: https://www.opus.pro/pricing (consultada 2026-11-17).
- **Planos:** Free ($0), Starter ($15/mês), Pro ($29/mês), Business (sob consulta). Preço anual e minutos por plano não apareceram no conteúdo extraído (o README do OpenShorts cita Starter 150 min e Free 60 min/mês com marca d'água — [não verificado na fonte primária]).
- **API:** Pro e Business listam **Video Editing API, Scheduler API e conector MCP**; Free/Starter sem API.
- **Benchmark de features:** clipping por fala (todos os planos); clipping por objetos visuais, som e emoção + modelo curado por gênero (Pro/Business); virality score (Starter+); AI reframe (9:16 em Free/Starter; 1:1 e 16:9 + tracking de objeto em movimento no Pro+); legendas animadas; **export para Premiere Pro / DaVinci Resolve** (Pro+).
- **Uso no projeto:** apenas referência de qualidade (especialmente: detecção por **som/visual** e export para NLE são os diferenciais que o pipeline local deve imitar).

## G) Disponibilidade de sinais (fatos de API)

| Pergunta | Resposta | Fonte |
|---|---|---|
| YouTube Data API v3 expõe "Mais repetidos" (heatmap)? | **Não.** O recurso `videos` tem `snippet, contentDetails, status, statistics, player, topicDetails, recordingDetails, fileDetails, processingDetails, suggestions, liveStreamingDetails, localizations…` — nenhum campo de heatmap/retenção. Só existem scrapers/proxies não oficiais (Apify, yt.lemnoslife) — fora dos ToS, não recomendados. | [doc oficial] https://developers.google.com/youtube/v3/docs/videos |
| Ler chat ao vivo via `liveChatMessages`? | **Sim, durante a live.** `liveChatMessages.list` custa **5 unidades de quota** por chamada; o `liveChatId` vem de `liveBroadcast.snippet.liveChatId`; recomenda-se `liveChatMessages.streamList` (push) para economizar quota. Requer OAuth. A doc **não diz explicitamente** se vale para transmissões de terceiros; relatos da comunidade dizem que chats públicos de qualquer live são legíveis — **não verificado**. Para a própria live, funciona. | [doc oficial] https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list |
| Chat replay de lives passadas pela API oficial? | **Não.** Ao encerrar, a API retorna `403 liveChatEnded` ("The specified live chat is no longer live"). Solução: **gravar o chat durante a live** (ou usar ferramentas não oficiais tipo yt-dlp/chat-downloader — fora da API oficial, não verificado). | [doc oficial] mesma página |
| Retenção de audiência (`audienceWatchRatio`) dos **próprios** vídeos? | **Sim.** YouTube Analytics API, relatório "Audience retention": dimensão `elapsedVideoTimeRatio`, métricas `audienceWatchRatio`, `relativeRetentionPerformance`, `startedWatching`, `stoppedWatching`; filtro obrigatório `video` (um ID por vez); exige autorização do **dono do canal** (`ids==channel==MINE`). É o substituto legítimo do "Mais repetidos" — mas **só para vídeos do próprio canal** e com atraso de processamento. | [doc oficial] https://developers.google.com/youtube/analytics/channel_reports , https://developers.google.com/youtube/analytics/metrics |
| Twitch: clips e VODs | **Sim.** Helix `Get Clips` (app token ou user token) retorna `video_id`, `vod_offset` (segundos no VOD), `view_count`, `duration`; `Get Videos` lista VODs; `Create Clip` exige scope `clips:edit`. | [doc oficial] https://dev.twitch.tv/docs/api/reference/clips , https://dev.twitch.tv/docs/api/reference/#get-videos |
| Twitch: chat | **Ao vivo sim:** EventSub `channel.chat.message` é o método preferido; IRC ainda existe ("historically has an IRC interface"). Scopes de leitura (ex.: `user:read:chat`) não confirmados na página consultada — **não verificado**. **Replay de chat de VOD não é oferecido pela API oficial** (nenhum endpoint encontrado) → também gravar durante a live. | [doc oficial] https://dev.twitch.tv/docs/chat/ |

**Implicação:** para o canal, os sinais oficiais robustos são (1) chat **gravado em tempo real** das próprias lives (YouTube/Twitch), (2) clips de viewers na Twitch (`vod_offset`), (3) retenção `audienceWatchRatio` dos próprios VODs após publicação. "Mais repetidos" não deve ser dependência.

## H) Apps desktop open-source com LLM local (Ollama / LM Studio)

> **Não confirmado se algum destes é o app que o usuário mencionou.**

1. **zhouxiaoka/autoclip** — https://github.com/zhouxiaoka/autoclip — MIT; último commit 2026-11-03; app desktop **Tauri** (`.dmg` macOS Apple Silicon, `.exe` Windows) com Python/FFmpeg embutidos; corte/reframe/render locais; modelo de análise configurável incluindo **Ollama / LM Studio**; transcrição local Whisper/SenseVoice ou nuvem (Bailian/Alibaba, paga, opcional); também CLI/MCP. Foco em plataformas chinesas (Douyin, Xiaohongshu, Bilibili) + Shorts/Reels; casos de uso são entrevistas/podcasts. [lido no README-EN; não executado]
2. **Aseiel/VideoHighlighter** — https://github.com/Aseiel/VideoHighlighter — **AGPL-3.0** (+ CLA); último commit 2026-11-15; app desktop local que pontua momentos por cena/áudio/objetos/ações (rótulos Kinetics-700, OpenVINO), Whisper, Ollama (inclusive remoto na LAN), tem `mcp_server/`. Mais "analisador de highlights" do que exportador de Shorts — mas a abordagem multimodal (não só transcrição) é interessante para gameplay. [lido README/estrutura; não executado]
3. **artbyjazi/autoclip** — CLI local Whisper + Ollama/LM Studio — **não verificado** (só citado em busca).

---

## Recomendação

### Comparação final

| Critério | OpenShorts (self-host, LLM local) | Pipeline próprio (ffmpeg + faster-whisper + energia de áudio + scene detection + LLM scoring) | claude-shorts / clipify (skills) | video-use |
|---|---|---|---|---|
| Controle local | Alto (exceto features visuais que exigem Gemini) | **Total** | Alto | Médio (ElevenLabs obrigatório) |
| Saída editável | Editor web próprio; MP4 queimado; sem XML/EDL | **Total** (pode gerar EDL/FCPXML, SRT/ASS separados, JSON de cortes) | Arquivos intermediários acessíveis | Projeto em pasta, mas MP4 final |
| Estabilidade | Média: repo ativo demais, monólito, open-core | Alta se o código for pequeno e testado; depende do time | Baixa/média (autor único, interativo) | Média (v0.1.0) |
| Automação | **Alta** (REST, webhooks, MCP, CLI) | Alta (você define) | Baixa (fluxo interativo) | Baixa (conversacional) |
| Sem API paga obrigatória | Sim (com `LLM_BASE_URL`) | **Sim** | Sim (usa sessão Claude) | **Não** |
| Adequação a gameplay GTA (ação sem fala) | Fraca sem Gemini; bom sinal Twitch | **Melhor** (energia de áudio, transientes, chat, cena) | clipify tem modo ação por transientes | Não é o foco |
| Custo de construção | Baixo (pronto) | Médio/alto (semanas) | Baixo | Baixo |

### Veredito

**Motor primário recomendado: pipeline próprio (in-house), modular e pequeno**, e **não** um app de terceiros como núcleo. Motivos: (1) o conteúdo de GTA 6 é dominado por momentos de ação sem fala, e o melhor sinal vem de energia de áudio/transientes + chat gravado ao vivo + clips de Twitch + retenção própria — nenhuma ferramenta auditada combina isso localmente; (2) exige saída editável (EDL/FCPXML + legendas separadas) que nenhuma das opções open-source oferece; (3) estabilidade: um pipeline de ~5 módulos com dependências fixadas é mais previsível que acompanhar um monólito open-core que muda diariamente.

**OpenShorts como referência e "segunda opinião", não como núcleo:** usar seu código MIT como **fonte de componentes** (com atribuição): `reframe_v2.py` (crop dinâmico via `sendcmd`), `llm_backend.py` (cliente OpenAI-compatível com fallback de `response_format`), `twitch_signals.py` (heat por clips de viewers), `subtitles.py` (geração ASS). Evitar herdar `cloud/` (licença comercial) e avaliar a AGPL do `ultralytics` antes de incorporar YOLO (MediaPipe sozinho é Apache-2.0 [conhecimento prévio, não verificado]). Se for preciso entregar clips **já** antes do pipeline próprio existir, OpenShorts self-hosted com `LLM_BASE_URL` → Ollama é o melhor quebra-galho (fixado num commit), aceitando a limitação em vídeos sem fala.

**Esboço do pipeline próprio:** ingest (yt-dlp/arquivo local) → faster-whisper (word timestamps, pt-BR) → PySceneDetect → energia RMS/transientes de áudio (librosa/numpy; ideia do `detect_transients.py` do clipify) → densidade do chat gravado ao vivo + Twitch `vod_offset` + `audienceWatchRatio` (pós-publicação, para recalibrar) → fusão de sinais em candidatos → **LLM local (Ollama, 7–14B, contexto ≥16k)** para ranquear/titular → saída **JSON de cortes + EDL/FCPXML + SRT/ASS** → render ffmpeg 9:16 (reframe simples: crop central/HUD-aware; gameplay raramente precisa de face tracking, só a câmera do streamer) → revisão humana no NLE. OpusClip fica só como benchmark de qualidade (Pro tem export Premiere/DaVinci e detecção por som/visual — é a barra a atingir).

**Pendências não verificadas:** execução real de qualquer ferramenta; qualidade de LLM local em pt-BR para ranking; leitura de chat de lives de terceiros via `liveChatMessages`; scopes exatos de chat da Twitch; licença atual do Remotion e do ultralytics; números de estrelas.
