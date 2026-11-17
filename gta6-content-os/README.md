# GTA 6 Content OS

Máquina editorial e de produção para um canal brasileiro sobre Grand Theft Auto VI (nome provisório **SEIS ESTRELAS** — canal de fã, sem vínculo com Rockstar/Take-Two).

Prioridade: **qualidade editorial > credibilidade > originalidade > qualidade audiovisual > velocidade > automação > volume.**

## Estado em 17/11/2026 (primeira entrega)

| Entrega | Status | Onde |
|---|---|---|
| Estrutura independente | ✅ | este diretório |
| Auditoria de ferramentas | ✅ (leitura de código; nenhuma ferramenta de terceiros executada) | `docs/auditoria-ferramentas-clipping.md` |
| Identidade editorial provisória | ✅ aguardando aprovação | `memory/identidade-editorial.md` |
| Radar de fontes oficiais | ✅ funcional, 3 fontes reais | `content/radar-2026-11-17.md` |
| 5 pautas prioritárias | ✅ | `content/pautas/fila.md` |
| 3 roteiros de Shorts | ✅ Gates 1 e 2 aprovados | `content/roteiros/s0*.json` |
| 1 roteiro de vídeo longo | ✅ Gates 1 e 2 aprovados | `content/roteiros/l01-tudo-confirmado.json` |
| Short piloto renderizado | ✅ Gates 1–3 aprovados · **voz guia sintética** | `entregas/s01-tres-numeros-v1.mp4` |
| Demonstração de clipping | ✅ vídeo CC (não publicável) | `output/clip-demo-tos/` (não versionado) · painel |
| Plano de primeira publicação | ✅ | `docs/plano-primeira-publicacao.md` |
| Calendário 30 dias | ✅ | `content/calendario-30-dias.md` |

Detalhes, decisões e riscos: `docs/arquitetura.md`. Pendências reais: `docs/pendencias.md`.

## Rodar

Requisitos: Node ≥ 22.13, Python 3.11+, ffmpeg, Chromium (Playwright).

```bash
npm install
python3 -m venv clip-engine/.venv && clip-engine/.venv/bin/pip install faster-whisper piper-tts numpy
# voz guia (CC0): baixar pt_BR-faber-medium.onnx(+.json) de huggingface.co/rhasspy/piper-voices para clip-engine/models/piper/
```

```bash
npm run pipeline                         # radar → pautas → calendário → fact-check → painel
npm run render:short -- s01-tres-numeros # produção do Short (bloqueia se o Gate 1 reprovar)
npm run clip -- <video> <rights.json>    # Auto Clip Studio (recusa sem manifesto de direitos)
npm run review                           # entregas/painel-revisao.html
GTA_OS_REVIEWER="Nome" npm run approve -- render <id>-v<versão>
npm run publish -- <id> [--real]         # dry-run por padrão; envia como PRIVADO
npm test && npm run typecheck
```

## Regras que o código impõe
- Toda afirmação de roteiro tem citação **literal** de fonte CONFIRMADA verificada < 72 h; números e datas na tela também.
- Nada é publicado sem aprovação humana da **versão atual**; editar invalida a aprovação.
- Clipping exige manifesto de direitos; `publishable:false` bloqueia publicação.
- Serviços pagos exigem opt-in (`GTA_OS_ALLOW_PAID`), mesmo com chave presente.
- Credenciais só por variável de ambiente.
