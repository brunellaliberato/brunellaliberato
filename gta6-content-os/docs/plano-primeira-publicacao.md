# Plano — primeira publicação (após revisão e aprovação)

**Conteúdo:** `entregas/s01-tres-numeros-v1.mp4` — "GTA 6 em 3 números (todos oficiais)", ~47 s.
**Janela ideal:** até 18/11 (antes do lançamento; o Short diz "o lançamento continua 19 de novembro" e mostra "FALTAM N DIAS" calculado no render).

## Checklist da Brunella (≈ 20 min)

1. **Assistir** ao MP4 com som e sem som. Conferir no celular.
2. **Decidir sobre a voz** (recomendação: opção A):
   - A) Gravar a narração você mesma (texto em `content/roteiros/s01-tres-numeros.json`, 6 falas). Salvar um WAV por fala → eu troco a voz e re-renderizo em ~3 min, sem refazer o resto.
   - B) Autorizar ElevenLabs (`GTA_OS_ALLOW_PAID=elevenlabs`) — custa créditos; ainda soa sintético.
   - C) Publicar com a voz guia Piper — **não recomendado** (pronuncia "Leonida" e "ray tracing" mal; declara mídia sintética).
3. **Aprovar o nome provisório** "SEIS ESTRELAS" e a identidade (`memory/identidade-editorial.md`) — ou pedir alternativas.
4. Conferir o checklist humano dos gates (tradução fiel, tempo verbal, opinião marcada).
5. Aprovar:
   ```bash
   GTA_OS_REVIEWER="Brunella" npm run approve -- render s01-tres-numeros-v1
   ```

## Para publicar pela API (opcional — também pode subir manualmente no YouTube Studio)

1. Criar projeto no Google Cloud → ativar **YouTube Data API v3** → credencial OAuth (app desktop), escopo `youtube.upload`.
2. Gerar o token pelo fluxo OAuth e salvar fora do repo; `export YOUTUBE_TOKEN_FILE=/caminho/token.json`.
3. Ensaio sem enviar: `npm run publish -- s01-tres-numeros` (mostra o payload).
4. Envio real (sobe como **PRIVADO**): `npm run publish -- s01-tres-numeros --real`. Revisar no Studio e então agendar/publicar.

O sistema recusa enviar se: não houver aprovação da **versão atual**, algum gate estiver reprovado, o mesmo arquivo já tiver sido enviado, ou faltar quota.

## Depois de publicar
- Registrar o ID do vídeo; janelas de leitura: 24 h, 72 h, 7 d (Fase 5 automatiza).
- Próximos: s02 (Xbox One) em 18/11; vídeo longo l01 precisa de narração + produção 16:9 (template pendente).
