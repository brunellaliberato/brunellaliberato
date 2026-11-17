/**
 * Calendário editorial de 30 dias. Âncoras = datas OFICIAIS conhecidas; o resto são slots por fase.
 * Todo dia tem uma RESERVA URGENTE (vazia por padrão) — notícia oficial nova empurra o slot de menor prioridade.
 * Volume é teto, não meta: um slot sem conteúdo aprovado simplesmente não publica.
 */
import { launchPhase } from '../../core/config.js';

export interface CalendarEntry {
  date: string;
  phase: string;
  tema: string;
  tipo: string;
  canal: 'YouTube';
  formato: 'Short' | 'Longo' | 'Reserva';
  prioridade: 1 | 2 | 3;
  referencia: string;
  gancho: string;
  roteiro: string;
  status: 'roteiro pronto' | 'em produção' | 'pronto p/ revisão' | 'a pautar' | 'depende de gameplay próprio' | 'reserva';
  responsavel: string;
  arquivos: string;
  publicacao: string;
  objetivo: string;
  metrica: string;
}

const ANCHORS: Partial<CalendarEntry>[] = [
  { date: '2026-11-17', tema: 'GTA 6 em 3 números oficiais', tipo: 'lista', formato: 'Short', prioridade: 1, roteiro: 's01-tres-numeros', status: 'pronto p/ revisão', referencia: 'Newswire 03/11 e 10/11', gancho: '212 gigas. É isso que o GTA 6 pode pedir do seu console.', arquivos: 'entregas/s01-tres-numeros-v1.mp4', objetivo: 'primeiro contato + comentários', metrica: '% visualizado / comentários por 1k views' },
  { date: '2026-11-17', tema: 'TUDO que a Rockstar confirmou', tipo: 'análise', formato: 'Longo', prioridade: 1, roteiro: 'l01-tudo-confirmado', status: 'roteiro pronto', referencia: '5 fontes oficiais', gancho: 'Só entra o que tem fonte oficial.', objetivo: 'vídeo de referência do lançamento', metrica: 'tempo médio assistido' },
  { date: '2026-11-18', tema: 'Xbox One via Cloud Gaming', tipo: 'explicativo', formato: 'Short', prioridade: 1, roteiro: 's02-xbox-one', status: 'roteiro pronto', referencia: 'Newswire 10/11', gancho: 'Tem Xbox One e achou que tinha ficado de fora?', objetivo: 'utilidade/compartilhamento', metrica: 'compartilhamentos' },
  { date: '2026-11-18', tema: 'Checklist do dia 19 (espaço, horário, pôster grátis)', tipo: 'explicativo', formato: 'Short', prioridade: 2, roteiro: 'pauta p04', status: 'a pautar', referencia: 'Newswire 03/11', gancho: 'Amanhã é o dia. Faz isso hoje.', objetivo: 'utilidade', metrica: '% visualizado' },
  { date: '2026-11-19', tema: 'LANÇAMENTO — primeiros 10 minutos (gameplay próprio)', tipo: 'gameplay narrado', formato: 'Short', prioridade: 1, roteiro: 'a gravar', status: 'depende de gameplay próprio', referencia: 'captura própria', gancho: 'Liguei o GTA 6 agora. Primeira coisa que reparei:', objetivo: 'presença no dia 1', metrica: 'views 24h' },
  { date: '2026-11-19', tema: 'Pôster e mapa de Leonida grátis — onde baixar', tipo: 'notícia', formato: 'Short', prioridade: 2, roteiro: 'pauta p04', status: 'a pautar', referencia: 'Newswire 03/11 (confirmar no dia que foi ao ar)', gancho: 'Tá de graça no site da Rockstar.', objetivo: 'utilidade', metrica: 'compartilhamentos' },
  { date: '2026-11-20', tema: 'Festival de lançamento em Miami (amanhã)', tipo: 'notícia', formato: 'Short', prioridade: 2, roteiro: 's03-festival-miami', status: 'roteiro pronto', referencia: 'Newswire 09/11', gancho: 'A Rockstar não vai só lançar o GTA 6.', objetivo: 'alcance fora do nicho', metrica: 'views de não inscritos' },
  { date: '2026-11-20', tema: 'Primeiras impressões (gameplay próprio, sem spoiler de história)', tipo: 'análise', formato: 'Longo', prioridade: 1, roteiro: 'a escrever após jogar', status: 'depende de gameplay próprio', referencia: 'gameplay próprio', gancho: '24 horas de GTA 6. O que ninguém te contou.', objetivo: 'autoridade', metrica: 'tempo médio assistido' },
  { date: '2026-11-22', tema: 'Melhores momentos da semana (clips próprios — Auto Clip Studio)', tipo: 'compilação', formato: 'Short', prioridade: 2, roteiro: 'gerado pelo clipping', status: 'depende de gameplay próprio', referencia: 'lives/gravações próprias', gancho: 'definido pelo momento', objetivo: 'testar motor de clipping', metrica: '% visualizado' },
  { date: '2026-12-11', tema: 'Trilha original do Justice saiu: a trilha que muda enquanto você joga', tipo: 'curiosidade', formato: 'Short', prioridade: 2, roteiro: 'pauta p05', status: 'a pautar', referencia: 'Newswire 29/10', gancho: 'A música do GTA 6 muda dependendo do que você faz.', objetivo: 'alcance música', metrica: 'views' },
];

/** Séries recorrentes por fase (preenchem dias sem âncora). Sem promessa de fatos: só formatos. */
const SERIES: Record<string, Partial<CalendarEntry>[]> = {
  LANCAMENTO: [
    { tema: 'Descoberta do dia (gameplay próprio)', tipo: 'curiosidade', formato: 'Short', prioridade: 2, gancho: 'Achei isso em Leonida e precisei mostrar.' },
    { tema: 'Dica rápida de início de jogo (testada por nós)', tipo: 'tutorial', formato: 'Short', prioridade: 2, gancho: 'Faz isso antes da 3ª missão.' },
  ],
  POS_LANCAMENTO: [
    { tema: 'Guia/segredo (testado em gameplay próprio)', tipo: 'guia', formato: 'Longo', prioridade: 2, gancho: 'Passo a passo, sem enrolação.' },
    { tema: 'Easter egg verificado', tipo: 'curiosidade', formato: 'Short', prioridade: 2, gancho: 'Essa referência passou batido.' },
    { tema: 'Desafio da semana', tipo: 'humor/desafio', formato: 'Short', prioridade: 3, gancho: 'Tentei X sem Y. Deu ruim.' },
  ],
  PRE_LANCAMENTO: [],
};

export function buildCalendar(start = new Date('2026-11-17T12:00:00Z'), days = 30): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(start.getTime() + d * 86_400_000);
    const iso = day.toISOString().slice(0, 10);
    const phase = launchPhase(day);
    const anchors = ANCHORS.filter((a) => a.date === iso);
    const fill = anchors.length ? [] : [SERIES[phase][d % Math.max(1, SERIES[phase].length)]].filter(Boolean);
    for (const a of [...anchors, ...fill]) {
      out.push({
        date: iso,
        phase,
        tema: a!.tema!,
        tipo: a!.tipo!,
        canal: 'YouTube',
        formato: a!.formato as CalendarEntry['formato'],
        prioridade: a!.prioridade as 1 | 2 | 3,
        referencia: a!.referencia ?? 'gameplay próprio',
        gancho: a!.gancho ?? '',
        roteiro: a!.roteiro ?? 'a escrever',
        status: (a!.status as CalendarEntry['status']) ?? 'depende de gameplay próprio',
        responsavel: a!.roteiro?.startsWith('s0') || a!.roteiro?.startsWith('l0') ? 'Brunella (aprovação) · máquina (produção)' : 'Brunella (captura) · máquina (edição)',
        arquivos: a!.arquivos ?? '—',
        publicacao: `${iso} ${a!.formato === 'Longo' ? '19:00' : '12:00'} BRT (sugestão, validar com Analytics)`,
        objetivo: a!.objetivo ?? 'consistência da série',
        metrica: a!.metrica ?? '% visualizado',
      });
    }
    out.push({
      date: iso, phase, tema: 'RESERVA URGENTE', tipo: 'notícia oficial nova', canal: 'YouTube', formato: 'Reserva', prioridade: 1,
      referencia: 'radar', gancho: '—', roteiro: '—', status: 'reserva', responsavel: 'radar → Brunella', arquivos: '—', publicacao: 'quando aprovado', objetivo: 'velocidade com precisão', metrica: 'views 24h',
    });
  }
  return out;
}

export function calendarMarkdown(c: CalendarEntry[]): string {
  const head = '| Data | Fase | Tema | Tipo | Formato | Prio | Referência | Gancho | Roteiro | Status | Responsável | Arquivos | Publicação | Objetivo | Métrica |\n|' + '---|'.repeat(15);
  const rows = c.map((e) => `| ${e.date} | ${e.phase} | ${e.tema} | ${e.tipo} | ${e.formato} | ${e.prioridade} | ${e.referencia} | ${e.gancho} | ${e.roteiro} | ${e.status} | ${e.responsavel} | ${e.arquivos} | ${e.publicacao} | ${e.objetivo} | ${e.metrica} |`);
  return `# Calendário editorial — 30 dias (gerado ${new Date().toISOString().slice(0, 10)})\n\n> Horários são sugestões iniciais sem dado do canal; serão recalibrados pelo YouTube Analytics. Slots "depende de gameplay próprio" não publicam sem captura própria.\n\n${head}\n${rows.join('\n')}\n`;
}
