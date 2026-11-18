---
name: gta-scriptwriter
description: Escreve roteiros de Shorts e vídeos longos do canal Seis Estrelas (GTA VI) no formato estruturado do projeto, com voz brasileira natural e afirmações rastreáveis. Use ao transformar uma pauta da fila em roteiro.
---

# gta-scriptwriter

## Entrada
Uma pauta de `content/pautas/` + itens do radar referenciados. Leia `memory/identidade-editorial.md` antes.

## Saída
`content/roteiros/<id>.json` no schema `Script` (validado por zod em `src/core/content.ts`): público, objetivo, promessa, gancho, beats (fala, tela, visual, edição, animação, áudio), CTA, claims com citação literal, fontes. `t` fica `[0,0]` — a produção mede a voz real e preenche.

## Regras de voz (o Gate 2 cobra as mecânicas)
- 1ª frase ≤ 18 palavras; 1º beat de Short ≤ 25 palavras (≈3 s). Sem intro, sem "fala galera".
- Frases ≤ 22 palavras em Short. Um fato por frase. Número em dígito na narração (a legenda usa o texto; a pronúncia vem de `memory/lexico-pronuncia.json`).
- Sempre dizer de onde veio ("tá no comunicado da Rockstar sobre o pré-download").
- Proibidos: prepare-se, mergulhar, revolucionário, não perca, confira, "neste vídeo vamos"…
- CTA como pergunta binária e específica (gera comentário): "212 GB ou 30 FPS?".
- Short termina "seco" para favorecer loop.

## Regra de idioma da voz (18/11/2026)
A narradora (Thalita, Microsoft) é multilíngue e troca de idioma sozinha. Por isso:
- **Nunca** usar expressões iguais ao espanhol, como "nada de" (saiu "basamento" em vez de "vazamento"). Use "sem…" / "aqui não tem…".
- Nome em inglês seguido de verbo embola a frase ("a Only Raw contratou" virou inglês). Use "a gravadora deles contratou".
- A lista viva fica em `memory/gatilhos-pronuncia.json`; o Gate 2 barra o roteiro. Toda frase gerada passa pela conferência por palavra (`clip-engine/voice_qa.py`) e o Gate 3 reprova o vídeo se alguma palavra não for reconhecida. Gatilho novo descoberto = adicionar na lista.

## Ângulos (pauta importante = 3 ângulos realmente diferentes)
Ex. pré-download: (1) **lista de números** (utilidade/debate), (2) **pergunta do espectador** ("tem Xbox One?"), (3) **o que NÃO foi dito** (credibilidade). Não são 3 versões do mesmo texto.

## Bom vs. ruim
- Ruim: "Prepare-se para mergulhar numa experiência revolucionária!"
- Bom: "212 gigas. É isso que o GTA 6 pode pedir do seu console."

## Sucesso
Gate 1 e Gate 2 aprovados (`npm run factcheck`) e, lido em voz alta, soa como gente.
