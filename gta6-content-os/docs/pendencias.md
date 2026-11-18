# Estado em 18/11/2026 (leia primeiro numa sessão nova)

**Canal:** O Canal do GTA 6 (@ocanaldogta6), criado. Config: `docs/canal-config.md`. Agenda: `docs/agenda-publicacao.md`.
**Publicados pela Brunella:** vídeo longo l02 (7 personagens). Entregues para postar: s05-jason, s07-nova-zelandia v3.
**Voz:** Thalita, ritmo "voz B" (+20%, +10Hz) — padrão em `src/modules/f-production/short.ts`. Produção licenciada exige `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` no ambiente (ainda não configurados); sem isso é voz de prévia (Gate 4 bloqueia).
**Chaves no ambiente da nuvem:** `GEMINI_API_KEY` salva pela Brunella em 18/11 (vale só em sessões novas) → usar o watch com engine gemini para assistir YouTube (o servidor é bloqueado pelo YouTube no yt-dlp; não contornar).
**Cortes de live (pedido de 18/11):** formato streamer em cima / jogo embaixo, com gancho, zoom nos picos, legenda com pop, emojis e SFX próprios → `scripts/corte-live.ts` + `studio/src/LiveCut.tsx` + `clip-engine/livecut_prep.py` + `clip-engine/sfx.py`. Testado só com filme CC (Tears of Steel). Falta: lives AUTORIZADAS (regra da Brunella: crédito não substitui autorização), coordenadas da facecam por streamer, sinal de chat, e a skill que a Brunella vai mandar (auditar antes de instalar). Referência: youtube.com/watch?v=cksCVmaX1qM.
**Pedido em aberto:** automatizar 10 Shorts/dia (tarefa agendada diária) — depende de gameplay próprio ou lives autorizadas + voz Azure.

# Pendências reais (17/11/2026)

## Bloqueiam a primeira publicação — dependem de você
- [ ] **Narração**: gravar as 6 falas do s01 (recomendado) ou autorizar ElevenLabs. A voz guia (Piper) ainda pronuncia mal "Leonida" e "ray tracing" (detectado por ASR, WER 17%).
- [ ] **Aprovar** nome/identidade provisórios e o MP4 piloto.
- [ ] **OAuth do YouTube** (se quiser publicar pela API) — ver `docs/plano-primeira-publicacao.md`.

## Material oficial (autorizado em 17/11)
- [ ] A política da Rockstar só tolera uso **não comercial**. Antes de ativar a monetização do canal: pedir licença à Take-Two (copyright@take2games.com) ou trocar o material oficial por gameplay próprio nos vídeos monetizados. O Gate 4 bloqueia automaticamente quando `GTA_OS_CHANNEL_MONETIZED=true`.
- [ ] Reconferir o texto da política direto na página de suporte (estava fora do ar, 503, em 17/11; a regra veio do texto citado pela busca).

## Respostas da Brunella (17/11)
- Remotion: empresa de 1 pessoa → **licença gratuita**, sem pendência.
- Canal do YouTube: **não existe**, será criado; não monetizado (material oficial da Rockstar liberado por enquanto).
- Skill paga de clipping: **não existe** — item encerrado.
- Nome "Seis Estrelas": **reprovado** — escolher novo nome (opções propostas em 17/11).
- Voz: Thalita escolhida; perguntou sobre Fish Audio — plano grátis e pesos abertos (S1-mini, CC-BY-NC-SA) são **não comerciais**; uso comercial exige plano pago. Recomendação mantida: Azure F0 (grátis, comercial).
- Material para clipar: Brunella vai enviar vídeos. Cada vídeo precisa de manifesto em rights/ (de quem é, autorização, prova).

## Decisões suas
- [ ] Provedor de LLM por função (roteiro / scoring de clip): Claude API, Ollama local ou nenhum. Hoje: nenhum (pontos marcados como indisponíveis).
- [ ] Item G (skill comercial de clipping com chat spikes/Most replayed) e item H (app desktop com Ollama/LM Studio): preciso do nome/link. Fato já verificado: "Most replayed" **não** existe na YouTube Data API; chat só é legível ao vivo (sem replay oficial) — logo, chat precisa ser gravado durante a live.

## Técnico — próximas fases
- **Fase 1 (resto):** template de vídeo longo 16:9 no Remotion; SEO completo do longo (5 títulos, 3 capas, capítulos); YouTube Data API key para o Módulo B (evidência de interesse + concorrência no índice).
- **Fase 2 (clipping):** testar com gravação própria de gameplay GTA 6 (a partir de 19/11); detector de eventos visuais de jogo; reframe com tracking (avaliar módulo MIT do OpenShorts); gravação de chat de lives próprias (YouTube `liveChatMessages` / Twitch EventSub); arquitetura de buffer circular para lives; preset `split_cam` precisa das coordenadas da sua facecam.
- **Fase 3:** painel web interativo (hoje: HTML estático gerado); thumbnails; mais componentes Remotion (comparador, mapa, lower third).
- **Fase 4:** fila de jobs (BullMQ ou equivalente) e agendamento; migrar SQLite → PostgreSQL se houver mais operadores.
- **Fase 5:** YouTube Analytics (retenção `audienceWatchRatio` dos próprios vídeos), relatórios 24h/72h/7d/28d, experimentos.
- Skills ainda **não criadas** (de propósito, processo não validado): gta-news-writer, gta-clipping, gta-motion, gta-quality-review, gta-youtube-seo.

## Limitações conhecidas
- Newswire: só os artigos linkados a partir da página /VI e seus "relacionados" (~5–12). Suficiente para GTA VI; não é o feed completo.
- Score do clipping é heurístico (sem LLM e sem chat). No teste com filme CC, os 3 escolhidos fazem sentido (c004 pega a piada inteira, setup + arremate), mas não foi comparado lado a lado com OpusClip.
- Preset `gameplay_fit` deixa vídeo 2,4:1 pequeno na tela vertical; para 16:9 de gameplay o tamanho é adequado.
- Envio real ao YouTube nunca foi executado (sem credenciais).
