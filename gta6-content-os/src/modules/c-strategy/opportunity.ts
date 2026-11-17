/**
 * MÓDULO C — CONTENT STRATEGY: índice de oportunidade editorial e fila de prioridades.
 * O índice ORDENA a fila. Ele não prevê views. Fatores sem dado ficam null e não são inventados:
 * o peso deles é redistribuído e isso é registrado nas notas.
 */
import type { NewsItem, OpportunityScore, Pauta } from '../../core/types.js';

export interface EditorialInputs {
  originalidade: number; // 0..10 — julgamento editorial: temos um ângulo que os outros não têm?
  viabilidade: number; // 0..10 — dá pra produzir com ativos que temos direito de usar?
  potencialConversa: number; // 0..10 — gera comentário/debate?
  riscoDireitos: number; // 0..10 — 0 = só material próprio
  evidenciaInteresse?: number | null; // exige YouTube Data API / tendências — null se indisponível
  concorrencia?: number | null; // idem
}

const W = {
  atualidade: 0.2,
  relevancia: 0.2,
  evidenciaInteresse: 0.15,
  originalidade: 0.15,
  viabilidade: 0.1,
  potencialConversa: 0.1,
  riscoDireitos: 0.05, // aplicado como (10 - risco)
  concorrencia: 0.05, // aplicado como (10 - concorrência)
};

export function opportunity(news: NewsItem[], inp: EditorialInputs, today = new Date()): OpportunityScore {
  const notas: string[] = [];
  const newest = Math.max(...news.map((n) => (n.publishedAt ? Date.parse(n.publishedAt) : 0)));
  const ageDays = (today.getTime() - newest) / 86_400_000;
  const atualidade = +Math.max(0, 10 - ageDays / 1.5).toFixed(1);
  const relevancia = +Math.max(...news.map((n) => n.relevance)).toFixed(1);
  const parts: [keyof typeof W, number | null][] = [
    ['atualidade', atualidade],
    ['relevancia', relevancia],
    ['evidenciaInteresse', inp.evidenciaInteresse ?? null],
    ['originalidade', inp.originalidade],
    ['viabilidade', inp.viabilidade],
    ['potencialConversa', inp.potencialConversa],
    ['riscoDireitos', 10 - inp.riscoDireitos],
    ['concorrencia', inp.concorrencia == null ? null : 10 - inp.concorrencia],
  ];
  const avail = parts.filter(([, v]) => v !== null) as [keyof typeof W, number][];
  const wsum = avail.reduce((s, [k]) => s + W[k], 0);
  const total = +(avail.reduce((s, [k, v]) => s + W[k] * v, 0) / wsum).toFixed(2);
  for (const [k, v] of parts) if (v === null) notas.push(`${k}: indisponível (sem fonte de dados autorizada configurada) — peso redistribuído`);
  if (news.some((n) => n.status !== 'CONFIRMADO')) notas.push('contém itens não confirmados — exige rotulagem no roteiro');
  return {
    atualidade,
    relevancia,
    evidenciaInteresse: inp.evidenciaInteresse ?? null,
    originalidade: inp.originalidade,
    viabilidade: inp.viabilidade,
    potencialConversa: inp.potencialConversa,
    riscoDireitos: inp.riscoDireitos,
    concorrencia: inp.concorrencia ?? null,
    total,
    notas,
  };
}

/** Fila de prioridades: oportunidade + urgência + bônus por formato duplo; pautas descartadas saem. */
export function priorityQueue(pautas: Pauta[], news: Map<string, NewsItem>): Pauta[] {
  return pautas
    .filter((p) => p.status !== 'descartada' && p.status !== 'publicada')
    .map((p) => {
      const urgent = p.newsIds.some((id) => news.get(id)?.urgent);
      const priority = +(p.opportunity.total + (urgent ? 1.5 : 0) + (p.format === 'ambos' ? 0.3 : 0)).toFixed(2);
      return { ...p, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}
