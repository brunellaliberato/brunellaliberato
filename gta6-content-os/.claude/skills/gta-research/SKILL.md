---
name: gta-research
description: Roda e interpreta o radar de notícias oficiais de GTA VI (Rockstar /VI, Newswire, YouTube oficial), com deduplicação, status factual e potencial editorial. Use para "o que tem de novo?", antes de pautar, e no início de cada dia de produção.
---

# gta-research

## Fontes autorizadas (já implementadas em `src/modules/a-intelligence/sources/rockstar.ts`)
| Fonte | Método | Observação |
|---|---|---|
| rockstargames.com/VI | HTML público | data de lançamento, plataformas, sinopse, edições |
| Rockstar Newswire | Chromium headless renderiza a página pública | corpo vem via JS |
| YouTube RockstarGames | RSS público | vídeos "watch" e "shorts" do mesmo upload são deduplicados |

**Não usar**: APIs internas/não documentadas (ex.: GraphQL do site), scraping com login, contorno de bloqueio.

## Passos
1. `npm run radar` → `content/radar-AAAA-MM-DD.{json,md}` e banco.
2. Leia **Alertas** primeiro (data divergente / item urgente).
3. Itens `DESATUALIZADO` (ex.: "Coming August 27" após a data) nunca viram pauta como novidade.
4. Para pautar: `content/pautas/*.json` referenciando `newsIds` → `npm run pautas` (índice de oportunidade; campos sem dado ficam `null`).

## Sucesso
3 fontes OK, data conferida, nenhum item duplicado no relatório, toda pauta nova apontando para item CONFIRMADO.
