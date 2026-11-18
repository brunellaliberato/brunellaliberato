/** Registra no radar as fontes oficiais do horário de liberação (conferidas em 18/11/2026). */
import { Repo } from '../src/core/db.js';
import type { NewsItem } from '../src/core/types.js';
const repo = new Repo();
const now = new Date().toISOString();
const base = { alsoReportedBy: [], lastVerifiedAt: now, status: 'CONFIRMADO', confidence: 1, relevance: 95, editorialPotential: 95, urgent: true, shortPotential: true, longPotential: false, spoilerRisk: 'nenhum', approval: 'PENDENTE' } as const;
const items = [
  { ...base, id: 'ps-horario-lancamento', eventKey: 'ps-horario-lancamento', title: 'PlayStation: GTA VI libera à meia-noite (horário local) de 19/11', summary: 'Página oficial de suporte da PlayStation.',
    evidence: 'Grand Theft Auto VI releases at midnight local time on November 19, 2026, on PlayStation®5 consoles.\nPre-load for Grand Theft Auto VI starts at midnight local time on November 10, 2026.',
    source: { kind: 'platform_official', name: 'PlayStation Support (GTA VI)', url: 'https://www.playstation.com/en-us/support/games/gta-vi-support/' }, publishedAt: now, eventDate: '2026-11-19', tags: ['platform_official'] },
  { ...base, id: 'newswire-preload', eventKey: 'newswire-preload', title: 'Grand Theft Auto VI Pre-Load Begins on November 10', summary: 'Newswire oficial de 03/11/2026.',
    evidence: "There’s still time to pre-order and ensure you're able to experience Grand Theft Auto VI when it launches on November 19.\nDigital pre-loading on PlayStation 5 will begin on Tuesday, November 10 at midnight local time in your respective time zone. On XBOX Series X|S, pre-loading begins globally on Tuesday, November 10 at 12 a.m. GMT.\nThe pre-load file will require up to 212 GB depending on your device, so make sure you've got ample space to begin pre-loading as soon as possible.",
    source: { kind: 'rockstar_newswire', name: 'Rockstar Newswire', url: 'https://www.rockstargames.com/newswire/article/k4ak9okk485712/grand-theft-auto-vi-pre-load-begins-on-november-10' }, publishedAt: '2026-11-03', eventDate: '2026-11-10', tags: ['rockstar_newswire'] },
] as unknown as NewsItem[];
for (const i of items) repo.put('news', i, 'manual-verificado');
console.log('ok', items.map((i) => i.id));
