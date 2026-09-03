# Publicador do @portrasdolance

Posta os Reels das séries no Instagram sozinho, um por dia, no horário de `config.json` (19h). **Quem publica é a Cloudflare** (Worker `portrasdolance-midia`, a cada 5 min), então o Mac pode estar desligado na hora do post. O Mac só precisa estar ligado para preparar (agendar) os posts. É a mesma base do publicador do @ojogoasclaras, sem a parte de IA que escreve posts: aqui o vídeo e a legenda já chegam prontos.

## Como funciona

1. Cada post é um arquivo em `fila/` com o vídeo, a capa e a legenda.
2. Quando o post está pronto para sair, troque `"status": "rascunho"` por `"status": "pronto"`.
3. A cada 15 minutos o Mac roda o **ciclo**:
   - se a pausa estiver ligada (no Mac ou pelo celular), não faz nada;
   - publica o que está agendado e com horário vencido, a não ser que tenha sido cancelado pelo celular;
   - dá a cada post "pronto" o próximo dia livre às 19h (pelo menos 3 h à frente), sobe o vídeo, entrega o post para a agenda da nuvem e manda o aviso no WhatsApp com o link da prévia ("Cancelar post" e "Pausar tudo");
   - confere na nuvem o que já saiu e atualiza a fila.
4. Na nuvem: 20 min antes do horário a Cloudflare manda o vídeo para o Instagram; no horário, publica e avisa no WhatsApp. Ela renova o token sozinha a cada 30 dias. Uma publicação que parar no meio nunca é repetida sozinha.
5. Depois de publicado (quando o Mac roda o ciclo de novo), o vídeo sai do ar e o histórico fica em `publicador/historico.jsonl`.

Caminho do post: rascunho → pronto → agendado → publicado (ou cancelado, erro).

## Comandos (na pasta `perfil-futebol`)

| Comando | O que faz |
|---|---|
| `npm run status` | perfil, cota da API, WhatsApp, pausa e fila |
| `npm run cloudflare` | guarda a chave da Cloudflare do perfil e põe a hospedagem no ar (uma vez só) |
| `npm run login` | login do Instagram pelo navegador: clique em Permitir e o token é guardado sozinho |
| `npm run token` | guarda o token do Instagram no `.env` (ele não aparece na tela) |
| `npm run nuvem` | leva token, WhatsApp e pausa para a nuvem (o login já faz isso sozinho) |
| `npm run aviso-teste` | manda um aviso de teste no WhatsApp |
| `npm run ensaio -- fila/<post>.json` | testa tudo no Instagram e para antes de publicar |
| `npm run agora -- fila/<post>.json` | publica já (pede para digitar PUBLICAR) |
| `npm run pausar` / `npm run retomar` | botão de pausa |
| `npm run agendador:ligar` / `npm run agendador:desligar` | liga ou desliga o ciclo automático do Mac |

O registro do ciclo fica em `publicador/ciclo.log`.

## Configuração (`.env`, nunca vai para o git)

- `IG_ACCESS_TOKEN`: token do @portrasdolance (use `npm run login` ou `npm run token`).
- `IG_APP_SECRET`: chave secreta do app Postagens_JogoAsClaras, usada só pelo `npm run login`. O link de volta `https://portrasdolance-midia.brunella.workers.dev/api/oauth-volta` precisa estar cadastrado no app da Meta.
- `CALLMEBOT_PHONE` e `CALLMEBOT_APIKEY`: os mesmos do Jogo às Claras.
- `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`: conta própria do perfil (use `npm run cloudflare`). O Jogo às Claras continua na conta dele.
- `MIDIA_URL`, `PAUSA_CODIGO`, `IG_TOKEN_RENOVADO_EM`: o publicador preenche sozinho.

## Limites

- Para AGENDAR, o Mac precisa estar ligado (pode agendar vários dias de uma vez). Para PUBLICAR, não.
- O ciclo do Mac só publica sozinho posts antigos sem "nuvem"; os da nuvem quem publica é a Cloudflare.
- O token é renovado sozinho a cada 30 dias.
- Sem WhatsApp configurado, nada é agendado.
