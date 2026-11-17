# Identidade editorial (PROVISÓRIA — aguarda aprovação)

## Nome provisório: **SEIS ESTRELAS**
Referência de fã ao "nível de procurado" da série e ao VI, sem usar marca, logo ou nome registrado da Rockstar.
O canal **nunca** se apresenta como oficial. Rodapé fixo em descrições: "Canal de fã, sem vínculo com a Rockstar Games ou a Take-Two."

Slogan: **"Notícia checada. Gameplay de verdade."**

## Posicionamento
A credibilidade é a marca. Enquanto o nicho se enche de "vazou!!!", o Seis Estrelas mostra o **selo** de cada informação na tela:

| Selo | Cor | Quando |
|---|---|---|
| CONFIRMADO | verde `#2BD576` | dito pela Rockstar ou plataforma oficial, com link |
| TERCEIROS | ciano `#3FD0FF` | imprensa confiável, ainda sem confirmação oficial |
| RUMOR | vermelho `#FF4D4D` | sem confirmação; só entra com aviso |
| TEORIA | roxo `#A98BFF` | interpretação nossa ou da comunidade |
| OPINIÃO | amarelo `#FFD23F` | o que a gente acha |

## Voz
- Amigo que joga muito e checa tudo. Fala "a gente", "olha isso", "pera". Sem gritaria.
- Frases curtas. Um fato por frase. Número concreto > adjetivo.
- Humor seco, nunca às custas do espectador.
- Sempre dizer **de onde** veio a informação ("tá no comunicado da Rockstar do dia 3").
- Quando não sabemos: "a Rockstar ainda não disse". Nunca preencher lacuna com chute.

### Proibido (o linter do Gate 2 barra automaticamente)
"prepare-se", "mergulhar", "revolucionário", "redefinir", "não perca", "neste vídeo vamos", "sem mais delongas", "incrível jornada", "você não vai acreditar", "chocante", "insano" (como muleta), "confira".

## Visual — tema "Pôr do sol de Leonida" (v2, pedido da Brunella em 17/11)
Estética **inspirada no GTA VI**; elementos 100% desenhados pelo canal (`studio/src/brand.ts`, `studio/src/ShortVideo.tsx`).

- **Céu:** degradê amostrado das artes de referência: roxo `#5B4A86` → malva `#9C74A8` → rosa `#DE8F95` → laranja `#F4A274`. Água roxa `#7D6BAE`, tinta/contorno ameixa `#1E0F2E`.
- **Acentos:** rosa-neon `#FF4FA3`, amarelo-sol `#FFD36B`, água `#3FD6E0`.
- **Cenário próprio em SVG:** sol retrô listrado, skyline em silhueta, palmeiras balançando, reflexo na água.
- **Tipografia (OFL):** **Bowlby One** (títulos e números, grossa e arredondada), **Yellowtail** (detalhes em letreiro neon, nunca para informação essencial), Inter (texto), JetBrains Mono (fontes/datas).
- **Estilo "adesivo":** texto branco com contorno ameixa grosso e sombra deslocada; cartões e selos com borda ameixa e sombra sólida, leve rotação.
- **Selos de status** mantêm as cores fixas (verde CONFIRMADO etc.): são informação, não decoração.
- **Movimento:** números factuais mostram o valor REAL desde o 1º quadro (pulso de escala, nunca contagem: qualquer quadro pode virar capa); selos "carimbam"; palmeiras balançam devagar. Nada de zoom/shake em toda frase.
- Toda tela com dado mostra a **fonte em mono** no rodapé.

### Material oficial (kit de mídia) — AUTORIZADO pela Brunella em 17/11/2026
Fonte: https://www.rockstargames.com/VI/media (ZIPs oficiais em `media/oficial/`, fora do git). Manifesto: `rights/rockstar-kit-midia.json`.

Regras de uso (o Gate 4 impõe as automáticas):
- **Crédito na tela** em todo beat com material oficial: "IMAGEM: ROCKSTAR GAMES" (automático).
- **Uso não comercial** (política da Rockstar para fãs): com `GTA_OS_CHANNEL_MONETIZED=true`, vídeos com material oficial são bloqueados até haver licença comercial (copyright@take2games.com) registrada no manifesto.
- **Sem spoiler**; não usar material vazado/pré-lançamento não oficial.
- Screenshots ficam **sob** a identidade do canal: tinta do pôr do sol, texto adesivo, selos e fonte. Nunca a arte oficial "pura" como se fosse peça da Rockstar.
- O canal continua sem usar o logo "VI", o letreiro "grand theft auto" ou o logo R★ como **marca própria** (avatar, banner, vinheta). Variantes "With_Logos" do kit não entram nos templates.
- Escolher imagem pelo que o beat diz (ex.: cidade densa para "Leonida cheia") e checar o corte 9:16: rosto/ação não podem ficar fora do quadro.

## Regras de imagem
- Não usar imagem gerada por IA como se fosse captura do jogo.
- Preferir motion gráfico próprio e gameplay próprio (a partir de 19/11).
