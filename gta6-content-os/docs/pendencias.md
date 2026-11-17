# Pendências reais (17/11/2026)

## Bloqueiam a primeira publicação — dependem de você
- [ ] **Narração**: gravar as 6 falas do s01 (recomendado) ou autorizar ElevenLabs. A voz guia (Piper) ainda pronuncia mal "Leonida" e "ray tracing" (detectado por ASR, WER 17%).
- [ ] **Aprovar** nome/identidade provisórios e o MP4 piloto.
- [ ] **OAuth do YouTube** (se quiser publicar pela API) — ver `docs/plano-primeira-publicacao.md`.

## Material oficial (autorizado em 17/11)
- [ ] A política da Rockstar só tolera uso **não comercial**. Antes de ativar a monetização do canal: pedir licença à Take-Two (copyright@take2games.com) ou trocar o material oficial por gameplay próprio nos vídeos monetizados. O Gate 4 bloqueia automaticamente quando `GTA_OS_CHANNEL_MONETIZED=true`.
- [ ] Reconferir o texto da política direto na página de suporte (estava fora do ar, 503, em 17/11; a regra veio do texto citado pela busca).

## Decisões suas
- [ ] Licença Remotion: a empresa tem mais de 3 funcionários? Se sim, precisa de Company License para uso comercial.
- [ ] Provedor de LLM por função (roteiro / scoring de clip): Claude API, Ollama local ou nenhum. Hoje: nenhum (pontos marcados como indisponíveis).
- [ ] Item G (skill comercial de clipping com chat spikes/Most replayed) e item H (app desktop com Ollama/LM Studio): preciso do nome/link. Fato já verificado: "Most replayed" **não** existe na YouTube Data API; chat só é legível ao vivo (sem replay oficial) — logo, chat precisa ser gravado durante a live.
- [ ] Canal: já existe? Qual o handle?

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
