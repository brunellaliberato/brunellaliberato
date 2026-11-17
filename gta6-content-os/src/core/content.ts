import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { paths } from './config.js';
import type { NewsItem, Script } from './types.js';
import type { Repo } from './db.js';

const BeatZ = z.object({
  t: z.tuple([z.number(), z.number()]),
  narration: z.string().min(1),
  onScreen: z.string(),
  visual: z.string(),
  edit: z.string(),
  animation: z.string(),
  audio: z.string(),
});
const ClaimZ = z.object({ text: z.string(), newsIds: z.array(z.string()).min(1), quote: z.string().min(3) });
export const ScriptZ = z.object({
  id: z.string(),
  pautaId: z.string(),
  format: z.enum(['short', 'longo']),
  style: z.string(),
  title: z.string(),
  audience: z.string(),
  goal: z.string(),
  promise: z.string(),
  hook: z.string(),
  fullText: z.string(),
  beats: z.array(BeatZ).min(1),
  cta: z.string(),
  claims: z.array(ClaimZ),
  sources: z.array(z.object({ kind: z.string(), name: z.string(), url: z.string().url() })),
  version: z.number().int(),
  approval: z.string(),
  notes: z.string().optional(),
});

export function loadScripts(): Script[] {
  const dir = join(paths.content, 'roteiros');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const s = ScriptZ.parse(JSON.parse(readFileSync(join(dir, f), 'utf8'))) as Script;
      s.fullText = s.fullText || s.beats.map((b) => b.narration).join('\n\n');
      return s;
    });
}

export function newsMap(repo: Repo): Map<string, NewsItem> {
  return new Map(repo.list<NewsItem>('news').map((n) => [n.id, n]));
}
