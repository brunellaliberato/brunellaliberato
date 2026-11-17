/**
 * Tipos de domínio compartilhados entre todos os módulos.
 * Toda entidade que carrega uma afirmação factual precisa apontar para fontes.
 */

export type FactStatus =
  | 'CONFIRMADO'
  | 'INFORMACAO_DE_TERCEIROS'
  | 'RUMOR'
  | 'TEORIA'
  | 'OPINIAO'
  | 'DESATUALIZADO';

export type LaunchPhase = 'PRE_LANCAMENTO' | 'LANCAMENTO' | 'POS_LANCAMENTO';

export type ApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'PRECISA_AJUSTE';

export type SourceKind =
  | 'rockstar_newswire'
  | 'rockstar_site'
  | 'rockstar_youtube'
  | 'platform_official'
  | 'press'
  | 'youtube_public'
  | 'community';

/** Peso de confiança por tipo de fonte. Só fontes oficiais geram CONFIRMADO automaticamente. */
export const SOURCE_TRUST: Record<SourceKind, number> = {
  rockstar_newswire: 1.0,
  rockstar_site: 1.0,
  rockstar_youtube: 1.0,
  platform_official: 0.95,
  press: 0.7,
  youtube_public: 0.4,
  community: 0.25,
};

export interface Source {
  kind: SourceKind;
  name: string;
  url: string;
}

export interface NewsItem {
  id: string;
  /** chave de deduplicação: mesmo acontecimento => mesma chave */
  eventKey: string;
  title: string;
  summary: string;
  /** trecho literal da fonte que sustenta o resumo (evidência) */
  evidence: string;
  source: Source;
  /** outras fontes que reportaram o mesmo acontecimento */
  alsoReportedBy: Source[];
  publishedAt: string | null;
  eventDate: string | null;
  lastVerifiedAt: string;
  status: FactStatus;
  confidence: number; // 0..1
  relevance: number; // 0..10
  editorialPotential: number; // 0..10
  shortPotential: boolean;
  longPotential: boolean;
  spoilerRisk: 'nenhum' | 'baixo' | 'medio' | 'alto';
  urgent: boolean;
  approval: ApprovalStatus;
  tags: string[];
}

export interface Pauta {
  id: string;
  title: string;
  angle: string;
  newsIds: string[];
  phase: LaunchPhase;
  format: 'short' | 'longo' | 'ambos';
  style: ScriptStyle;
  /** índice de oportunidade (priorização, NÃO previsão de views) */
  opportunity: OpportunityScore;
  priority: number;
  status: 'ideia' | 'aprovada' | 'em_roteiro' | 'em_producao' | 'pronta' | 'publicada' | 'descartada';
}

export interface OpportunityScore {
  atualidade: number;
  relevancia: number;
  evidenciaInteresse: number | null; // null = sem dado (ex.: sem API do YouTube)
  originalidade: number;
  viabilidade: number;
  potencialConversa: number;
  riscoDireitos: number; // quanto MAIOR, PIOR
  concorrencia: number | null; // null = não medido
  total: number;
  notas: string[];
}

export type ScriptStyle =
  | 'noticia_urgente'
  | 'curiosidade'
  | 'teoria'
  | 'humor'
  | 'comparativo'
  | 'explicativo'
  | 'lista'
  | 'analise'
  | 'gameplay_narrado'
  | 'reacao'
  | 'storytelling';

/** Uma afirmação factual feita no roteiro. Precisa de fonte. */
export interface Claim {
  text: string;
  newsIds: string[];
  /** citação literal da fonte que comprova */
  quote: string;
}

export interface ScriptBeat {
  t: [number, number]; // segundos [início, fim]
  narration: string;
  onScreen: string;
  visual: string;
  edit: string;
  animation: string;
  audio: string;
}

export interface Script {
  id: string;
  pautaId: string;
  format: 'short' | 'longo';
  style: ScriptStyle;
  title: string;
  audience: string;
  goal: string;
  promise: string;
  hook: string;
  fullText: string;
  beats: ScriptBeat[];
  cta: string;
  claims: Claim[];
  sources: Source[];
  version: number;
  approval: ApprovalStatus;
  notes?: string;
}

export interface GateResult {
  gate: 'FATOS' | 'CRIATIVIDADE' | 'AUDIOVISUAL' | 'PUBLICACAO';
  passed: boolean;
  /** checagens automáticas */
  checks: { name: string; ok: boolean; detail: string }[];
  /** itens que exigem olho humano (não bloqueiam a máquina, bloqueiam a publicação) */
  humanChecklist: string[];
  at: string;
}

export type RightsStatus =
  | 'PROPRIO'
  | 'LICENCA_ABERTA' // ex.: CC-BY, com atribuição
  | 'AUTORIZADO_POR_ESCRITO'
  | 'MATERIAL_OFICIAL_DIVULGACAO'
  | 'SEM_AUTORIZACAO'
  | 'DESCONHECIDO';

export interface Asset {
  id: string;
  path: string;
  kind: 'video' | 'audio' | 'image' | 'font';
  rights: RightsStatus;
  owner: string;
  license?: string;
  attribution?: string;
  proofUrl?: string;
}
