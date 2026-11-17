# Arquitetura — GTA 6 Content OS (v0.1, 17/11/2026)

## Visão geral

```
                ┌──────────────── fontes oficiais ────────────────┐
                │ rockstargames.com/VI · Newswire · YouTube RSS   │
                └───────────────┬─────────────────────────────────┘
                                ▼
 A INTELLIGENCE ── NewsItem (evidência literal, status, dedupe) ──► banco (versões + histórico)
                                ▼
 C STRATEGY ───── Pauta (índice de oportunidade) · fila · calendário 30d
                                ▼
 D SCRIPT STUDIO ─ Script (beats + claims com citação) ──► GATE 1 FATOS ─► GATE 2 CRIATIVIDADE
                                ▼
 F PRODUCTION ─── storyboard → voz por beat (cache) → timeline → Remotion → loudnorm → MP4
                                ▼                                   ▲
 E AUTO CLIP ──── vídeo autorizado → whisper → sinais → candidatos → corte 9:16 + legendas
                                ▼
                         GATE 3 AUDIOVISUAL (ffprobe, EBU R128, formato, ASR/WER)
                                ▼
 G SEO ────────── título/descrição/fontes a partir do roteiro
                                ▼
                   APROVAÇÃO HUMANA (por versão) ─► GATE 4 PUBLICAÇÃO
                                ▼
 H PUBLISHING ─── YouTube Data API (privado/agendado, ledger anti-duplicata, quota)
                                ▼
 I PERFORMANCE ── (fase 5) YouTube Analytics → J CREATIVE MEMORY
```

## Módulos e contratos

| Módulo | Código | Entrada → Saída | Estado |
|---|---|---|---|
| A Intelligence | `src/modules/a-intelligence/` | fontes → `NewsItem[]` + `content/radar-*.{json,md}` | **funcional** (3 fontes oficiais reais) |
| B Viral Discovery | `src/modules/b-discovery/` | — | **não iniciado** — precisa de `YOUTUBE_API_KEY` (gratuita) |
| C Strategy | `src/modules/c-strategy/` | pautas + news → fila priorizada, calendário 30d | **funcional** |
| D Script Studio | `content/roteiros/*.json` + schema zod em `src/core/content.ts` | pauta → `Script` | **funcional** (roteiros escritos pelo operador; geração por LLM aguarda provedor) |
| E Auto Clip | `clip-engine/clipper.py` | vídeo + `rights.json` → candidatos + MP4 9:16 + .srt/.ass/cutlist | **funcional** (motor próprio, testado em vídeo CC) |
| F Production | `src/modules/f-production/short.ts` + `studio/` (Remotion) | script + storyboard → MP4 | **funcional** (Short) · vídeo longo: pendente |
| G SEO | `src/modules/g-seo/seo.ts` | script → metadados | **básico** (Short) · 5 títulos/3 capas p/ longo: pendente |
| H Publishing | `src/modules/h-publishing/youtube.ts` | render aprovado → upload privado | **travas funcionais, envio real não testado** (sem OAuth) |
| I Performance | — | — | **não iniciado** (Fase 5) |
| J Creative Memory | `memory/`, `.claude/skills/` | identidade, léxico, 3 skills validadas | **inicial** |
| Gates | `src/gates/gates.ts` | 4 gates | **funcionais** (13 testes) |

### Persistência
`node:sqlite` (zero dependência) em `data/gta-os.sqlite`: tabela genérica `entities` com **versão** + `entity_history` (nada é sobrescrito sem rastro), `approvals` (ligada à versão), `publish_ledger` (hash do MP4, anti-duplicata), `quota_ledger`, `events` (log). Schema portável para PostgreSQL (JSON→JSONB) quando houver mais de um operador; os módulos só falam com `Repo`.

### Reprocessamento granular
- Voz: cache por hash(texto falado + voz). Corrigir 1 frase re-sintetiza 1 beat (medido: 2/6 beats reaproveitados após troca de léxico; 6/6 após mudança só visual).
- Legenda/visual: mudam no storyboard/props sem tocar na voz.
- Clipping: cada etapa grava artefato (`ingest.json`, `transcript.json`, `scenes.json`, `candidates.json`); `render` refaz só o corte.
- Cada render gera nova versão → a aprovação anterior deixa de valer.

## Decisões (e por quê)

1. **Motor de clipping próprio, não OpenShorts.** A auditoria (`docs/auditoria-ferramentas-clipping.md`) mostrou que o OpenShorts escolhe momentos pela transcrição e depende do Gemini para vídeo sem fala — o caso típico de gameplay. Motor próprio (ffmpeg + faster-whisper + energia + cena) é pequeno, local, editável e já roda. Componentes MIT do OpenShorts (reframe MediaPipe, `twitch_signals.py`) são candidatos a incorporar na Fase 2, fora de `cloud/` e após checar a licença AGPL do `ultralytics`.
2. **Remotion como motor de motion**, fontes embutidas (render offline/determinístico). ⚠️ **Licença Remotion:** gratuita para pessoa física e empresas com até 3 funcionários; acima disso exige *Company License*. Confirmar enquadramento antes de uso comercial.
3. **Voz guia local (Piper, dataset CC0)** em vez de ElevenLabs: há `ELEVENLABS_API_KEY` no ambiente, mas serviço pago só com autorização (`GTA_OS_ALLOW_PAID`). A recomendação editorial é **narração humana** — é a principal defesa contra "cara de fábrica de IA".
4. **Sem LLM no loop hoje:** não há chave configurada. Os pontos de LLM (geração de roteiro, scoring semântico de clip) estão isolados e marcados como "indisponível", não simulados.
5. **Só métodos autorizados de coleta.** Uma chamada à API GraphQL interna do site da Rockstar foi bloqueada durante o diagnóstico — correto; não será usada.

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Mudança de layout do site da Rockstar quebra o radar | radar falha | falha isolada por fonte + alerta; RSS do YouTube como redundância |
| Data de lançamento mudar | conteúdo errado | radar compara toda execução e emite ALERTA |
| Voz sintética soar artificial / errar nomes | credibilidade | Gate 3 com ASR/WER; narração humana antes de publicar |
| Direitos de clips de terceiros | strike/remoção | manifesto obrigatório; `publishable:false` bloqueia |
| Licença Remotion (empresa > 3 pessoas) | jurídico | verificar antes de monetizar |
| Quota YouTube (10k/dia; upload = 1.600) | ~6 uploads/dia | `quota_ledger` |
| Spoilers pós-19/11 | audiência | `spoilerRisk` no radar e alerta no clipping; Gate 4 |
