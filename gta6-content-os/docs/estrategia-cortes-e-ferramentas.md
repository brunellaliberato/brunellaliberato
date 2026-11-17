# Nova direção (17/11/2026): canal de CORTES de GTA

Decisão da Brunella: o foco principal do YouTube passa a ser **cortes de vídeos e lives de GTA**. Vídeos originais ("Histórias de Leonida", notícias) ficam como apoio para crescer e monetizar. Depois: Instagram de histórias e atualizações de GTA.

## O que muda no sistema

| Antes | Agora |
|---|---|
| Fluxo A (vídeo original) era o principal | **Fluxo B (clipping) é o principal** |
| Radar de notícias como pauta diária | Radar vira apoio; a pauta diária é **o que os criadores autorizados publicaram** |
| Voz guia Piper | **Thalita** (Microsoft): Azure plano grátis para publicar; Edge só prévia |
| Auto Clip testado em filme CC | Testar em **lives de GTA de criadores que autorizam cortes** (lista em `docs/pesquisa-streamers-cortes.md`) |

## Regra que sustenta o canal: só corta quem autoriza

- Crédito ao streamer **não** é autorização. O motor de clipping recusa vídeo sem `rights/<criador>.json`.
- O manifesto de cada criador guarda: link da regra pública (ou do e-mail/mensagem de autorização), formato de crédito exigido, se permite monetizar, repasse de receita, conteúdo proibido, data de verificação.
- Programas de cortes costumam ter regras próprias (cadastro, pagamento por view, proibição de certos temas). O manifesto segue essas regras, e o Gate 4 confere.
- Monetização de canal de cortes no YouTube: depende da política de "conteúdo reutilizado" do YouTube — o corte precisa ter edição/contexto próprio (gancho, legenda, recorte), não reupload cru. Detalhes e fonte oficial na pesquisa.

## Formato obrigatório: CORTE NARRADO (monetização)

Política oficial do YouTube (https://support.google.com/youtube/answer/1311392, conferida em 17/11/2026):
- "Esta política é válida mesmo se você tiver a permissão do criador original."
- **Não monetiza:** "Clipes de momentos do seu programa favorito reunidos por edição, com poucos ou nenhum comentário"; "Vídeos curtos compilados de outras redes sociais".
- **Permitido:** "Filmagem editada de outros criadores de conteúdo em que você adiciona uma narrativa e comentários."

Então todo corte do canal leva **narração da Thalita**: contexto antes ("o Paulinho tava fugindo da polícia quando…"), o momento, e um comentário/desfecho depois. Autorização do criador continua obrigatória — ela resolve o direito autoral; a narração resolve a monetização. São duas exigências diferentes.

Fontes de material (resultado da pesquisa em `docs/pesquisa-streamers-cortes.md`):
1. **Autorização direta e por escrito** do criador (plataforma, monetização, prazo, crédito) — único caminho para canal permanente.
2. **Campanhas de cortes (Viewx etc.)** — temporárias, por prazo e hashtag; tratar cada vídeo como autorizado só dentro da campanha.
3. **Gameplay/lives próprios** a partir de 19/11 — sem dependência de ninguém.
4. Vídeos marcados como **CC BY** no YouTube.
Nenhum streamer BR de GTA encontrado com autorização pública aberta para qualquer canal.

## Fluxo de cortes (como vai rodar)

```
lista de criadores autorizados  →  novo vídeo/live (RSS do canal do criador)
  → download do VOD (só criadores com manifesto)
  → clipper.py analyze  (transcrição + energia de áudio + cortes de cena + reações)
  → método yt-shorts na seleção (abre num pensamento completo, tem virada, termina numa fala)
  → render 9:16: gameplay inteiro com fundo desfocado (preserva HUD/minimapa) ou split facecam/jogo
  → gancho na tela (texto do próprio corte) + legenda palavra a palavra + crédito do criador
  → Gates 3 e 4 (direitos, crédito, spoiler)  →  aprovação humana  →  publicação
```

Sinais de momento (verificado na auditoria): **"Mais repetidos" não existe na API do YouTube**; chat só é legível **durante** a live (sem replay oficial) — se um criador autorizar, gravamos o chat ao vivo. Twitch: clipes feitos pelos espectadores (Helix API, gratuita) indicam os momentos quentes do VOD.

## Os 5 materiais enviados — o que aproveitamos

### 1. "As 30 skills pra editar e criar vídeo no Claude"
| Ferramenta | Decisão | Motivo |
|---|---|---|
| **Watch** (bradautomates/claude-video) | **usar** — já existe nesta sessão como plugin `watch` (precisa configurar) | estudar cortes de referência antes de editar |
| **FFmpeg Skill** (kajisho5) | candidata | `audio.py` com música que abaixa sozinha na fala (ducking) e `fit.py` 9:16; nosso pipeline já faz loudnorm e corte |
| **Remotion Agent Skills** (oficiais) | instalar quando formos expandir motion | já usamos Remotion; as skills só ensinam o Claude a usar melhor |
| HyperFrames (HeyGen) | não agora | faz o mesmo que o nosso Remotion |
| Claude Shorts / Clipify / Cut Video | não | nosso motor já faz isso; Clipify e Cut Video vêm prontos para inglês |
| Video-use | não | exige chave da ElevenLabs para transcrever (você não quer serviço pago) |
| Caption Clip, Omni Captions | não | exigem chave paga (Deepgram, Gemini/LattifAI) |
| Pexo, Higgsfield, Kling | **não** | geram vídeo com IA e gastam crédito; e imagem de IA não pode se passar por cena do jogo |
| Thumbnail Skills | não | gera prompt para imagem de IA; capas do canal usam quadro real do corte |
| Color Grade AI | não agora | gameplay não precisa de correção de cor de câmera |
| **Skill Creator** | **usar** | transformar o fluxo de cortes aprovado em skill `gta-clipping` |

### 2. "5 skills grátis antes do seu próximo Reel"
- **Instagram Agent** (mesmo autor da youtube-agent-skill) → instalar na fase Instagram.
- Marketing Skills (copy-editing) → útil para revisar descrições/legendas; opcional.
- **RemoCN** (componentes Remotion, MIT) → fonte de animações prontas quando formos refinar motion.

### 3. "rea-video" (JuneYaooo/rea-video, Apache-2.0) — INSTALADO em 17/11 (`scripts/install-rea-video.sh`, commit 07dd587)
Testado no nosso Short piloto. **Acerta:** cortes de cena (6/6 exatos), camada de legendas e textos (tempo, cor, contorno, animação; exporta .srt/.ass/timeline.json), camadas fixas, separação voz/música. **Erra:** origem da imagem (screenshot virou "filmagem/IA" mesmo após revisão do Claude — a ferramenta não deixa a revisão derrubar a medição), BPM (86 medido vs 96 real), parte do OCR. Transcrição embutida não entende pt-BR (não instalada; usamos Whisper). Relatório só em inglês/chinês. ~4 min para 47 s de vídeo. Uso: estudar edição de cortes de referência, ignorar o veredito "como foi feito".
Antes: para engenharia reversa dos cortes de referência: desmonta um vídeo cena por cena (cortes, legendas com tempo, música/BPM, efeitos) e gera `report.html`. Uso: estudar 3–5 cortes de GTA que passaram muito da média do canal e extrair o padrão de edição — a estrutura, nunca o conteúdo.

### 4. "Clipes de GTA 6 em poucos minutos" (OpenShorts)
Já auditado (`docs/auditoria-ferramentas-clipping.md`). O guia usa a chave do Gemini (tem uso grátis, mas é serviço externo); nosso motor faz o equivalente local sem chave. Ideias que entram no nosso fluxo: **perseguições, batidas, falhas engraçadas e bugs** como alvos de corte; e os **programas de cortes que pagam por visualização** como fonte de receita.

### 5. "Ferramentas para criar clipes e Shorts"
- **Skill paga de clipping GTA** (chat spikes, Most replayed, ao vivo): link de afiliado, vendedor não identificado. Não comprar. Os sinais que ela promete: "Most replayed" não está na API oficial; chat só ao vivo.
- **App desktop com Ollama/LM Studio**: ainda não identificado. Candidatos da auditoria: zhouxiaoka/autoclip (MIT).
- **OpusClip**: referência de qualidade (plano grátis com marca d'água) — dá para comparar nossos cortes com os dele no mesmo vídeo autorizado.

### Já instalado agora
**youtube-agent-skill** (Jakeschincariol, MIT) — 11 skills `yt-*` em `.claude/skills/`. Scripts auditados: só leem arquivos locais, sem rede nem chave. Voz do canal em `memory/youtube-voice.md`.
Limitação encontrada: as **notas numéricas** de gancho/título (`hookscore.py`, `title.py`) usam listas de palavras em inglês — em português dão a mesma nota baixa para qualquer frase (testado). Usar o **método** das skills, não a nota. Mais úteis para nós: `yt-shorts` (escolha de cortes), `yt-package` (título + capa), `yt-retention` (ler retenção exportada do Studio), `yt-viral` (achar o que performa acima da média no nicho).
