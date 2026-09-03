# Vídeo — Série 01, Parte 1 (A Taça Que Sumiu)

Saída: `out/jules-rimet-parte1.mp4` (1080x1920, ~49 s, voz clonada da Brunella) e `out/capa-parte1.png`.

| Parte | Onde fica |
|---|---|
| Fala e legenda de cada trecho (`**destaque**`, `|` separa blocos) | `src/data/roteiro.json` |
| Narração | `audio-src/<id>.mp3` (bruto) → `public/audio/<id>.wav` |
| Cenas e animações | `src/Parte1.tsx` |
| Peças visuais (taça, vitrine, título, legenda) | `src/ui.tsx` |

Passo a passo:
1. Abra o app **VoiceStudio** (a API local dele fica em 127.0.0.1:3900).
2. Voz: `python3 scripts/narracao.py --refazer`. Usa a "Voz Brunella" do VoiceStudio. Se o app estiver fechado, cai para OpenAI (com `OPENAI_API_KEY`) ou para a voz Luciana do Mac.
3. Legenda sincronizada: `python3 scripts/tempos.py` (transcrição local do VoiceStudio, tempo de cada palavra).
4. Prévia: `npm run studio`. Vídeo final: `npm run render`.

`node_modules` é um atalho para o do `spa-reels` (mesma versão do Remotion).

**Licença:** o motor de voz do VoiceStudio (k2-fsa/OmniVoice) é CC-BY-NC, ou seja, não comercial. Para monetizar o perfil, trocar por um motor com licença comercial ou usar gravação humana.
