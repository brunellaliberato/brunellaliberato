---
name: gta-fact-checker
description: Checa fatos de roteiros do canal Seis Estrelas (GTA VI) contra as evidências literais do radar. Use antes de produzir/aprovar qualquer roteiro, quando alguém perguntar "isso é oficial?", ou ao revisar título/thumbnail.
---

# gta-fact-checker

Processo validado em 17/11/2026 (4 roteiros, 43 afirmações, 0 falsos positivos após ajustes).

## Regra de ouro
Uma afirmação só é fato se existir **citação literal** dela na evidência de um item do radar com status `CONFIRMADO`, verificado há < 72h. Não existe "todo mundo sabe".

## Passos
1. `npm run radar` — re-verifica fontes oficiais (página /VI, Newswire renderizado, RSS do YouTube oficial). Se a data de lançamento divergir, PARE tudo e avise.
2. Para cada frase do roteiro com fato (número, data, nome, plataforma, recurso), garanta um item em `claims[]` com `quote` copiada **da evidência** (`content/radar-AAAA-MM-DD.json`), não do seu resumo.
3. `npm run factcheck`. O Gate 1 reprova se: citação não existe na evidência; fonte não é CONFIRMADO; verificação velha; número ou data DD/MM na tela sem citação.
4. Revise manualmente o checklist humano: tradução não pode exagerar ("targeting 30 fps" = "mira 30 fps", nunca "roda a 30 fps"); tempo verbal vs. data de publicação; opinião com selo OPINIÃO.

## Exemplos
- ✅ "mira 30 quadros por segundo" ← `targeting 30 frames per second`
- ❌ "GTA 6 não vai sair no PC" — a fonte só diz que a página lista PS5 e Xbox Series. Forma correta: "PC não foi anunciado".
- ❌ Inventar consenso ("tem gente dizendo que…") sem link para a discussão.
- ✅ Cálculo nosso (fuso horário) entra em `notes` como cálculo, nunca atribuído à Rockstar.

## Sucesso
`GATE FATOS: APROVADO` para o roteiro e nenhum item do checklist humano em aberto.
