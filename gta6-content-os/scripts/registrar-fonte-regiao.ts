/** Imprensa (TERCEIROS): jogar antes no Xbox mudando a região para a Nova Zelândia. Conferido em 18/11/2026. */
import { Repo } from '../src/core/db.js';
import type { NewsItem } from '../src/core/types.js';
const repo = new Repo();
const now = new Date().toISOString();
repo.put('news', {
  id: 'imprensa-truque-nz', eventKey: 'imprensa-truque-nz', title: 'GTA 6 pode ser jogado antes no Xbox com truque da Nova Zelândia', summary: 'Critical Hits, 02/11/2026.',
  evidence: 'poderão tentar acessar o jogo mais cedo alterando a localização do console para a Nova Zelândia.\nfaz o sistema considerar que a conta está em uma região onde o lançamento acontece antes.',
  source: { kind: 'press', name: 'Critical Hits', url: 'https://criticalhits.com.br/games/gta-6-pode-ser-jogado-antes-no-xbox-com-truque-da-nova-zelandia/' },
  alsoReportedBy: [{ kind: 'press', name: 'Canaltech', url: 'https://canaltech.com.br/games/mais-uma-polemica-gta-6-tera-trava-de-regiao-no-ps-5-mas-xbox-fica-livre/' }],
  publishedAt: '2026-11-02', eventDate: '2026-11-18', lastVerifiedAt: now, status: 'INFORMACAO_DE_TERCEIROS', confidence: 0.7,
  relevance: 80, editorialPotential: 85, urgent: true, shortPotential: true, longPotential: false, spoilerRisk: 'nenhum', approval: 'PENDENTE', tags: ['press'],
} as unknown as NewsItem, 'manual-verificado');
console.log('ok');
