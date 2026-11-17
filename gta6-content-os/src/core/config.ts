import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import type { LaunchPhase } from './types.js';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const paths = {
  root: ROOT,
  db: process.env.GTA_OS_DB ?? join(ROOT, 'data', 'gta-os.sqlite'),
  content: join(ROOT, 'content'),
  output: join(ROOT, 'output'),
  entregas: join(ROOT, 'entregas'),
  memory: join(ROOT, 'memory'),
  clipEngine: join(ROOT, 'clip-engine'),
  python: join(ROOT, 'clip-engine', '.venv', 'bin', 'python'),
  studio: join(ROOT, 'studio'),
};

/**
 * Data de lançamento. Valor verificado em https://www.rockstargames.com/VI
 * ("Coming November 19, 2026") em 2026-11-16/17. O radar re-verifica a cada execução
 * e emite alerta se a página oficial mudar.
 */
export const LAUNCH = {
  date: '2026-11-19',
  verifiedAt: '2026-11-17',
  sourceUrl: 'https://www.rockstargames.com/VI',
};

export function launchPhase(today = new Date(), launch = LAUNCH.date): LaunchPhase {
  const d = Date.parse(today.toISOString().slice(0, 10));
  const l = Date.parse(launch);
  const days = (d - l) / 86_400_000;
  if (days < 0) return 'PRE_LANCAMENTO';
  if (days <= 14) return 'LANCAMENTO';
  return 'POS_LANCAMENTO';
}

export function daysToLaunch(today = new Date(), launch = LAUNCH.date): number {
  return Math.round((Date.parse(launch) - Date.parse(today.toISOString().slice(0, 10))) / 86_400_000);
}

/** Credenciais vêm SEMPRE do ambiente. Nunca do código. */
export const env = {
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  youtubeOAuthClientFile: process.env.YOUTUBE_OAUTH_CLIENT_FILE,
  youtubeTokenFile: process.env.YOUTUBE_TOKEN_FILE,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  /** Serviços pagos exigem opt-in explícito, mesmo com chave presente. */
  allowPaid: (process.env.GTA_OS_ALLOW_PAID ?? '').split(',').filter(Boolean),
};
