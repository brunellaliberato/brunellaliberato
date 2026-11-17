/**
 * MÓDULO H — PUBLISHING (YouTube Data API v3, upload resumable)
 *
 * Travas, em ordem — qualquer falha interrompe ANTES de tocar na rede:
 *  1. aprovação humana registrada para a VERSÃO atual do render
 *  2. gates 1–3 aprovados
 *  3. ledger anti-duplicata (hash do arquivo) — o mesmo MP4 nunca sobe duas vezes
 *  4. orçamento de quota diário (videos.insert = 1600 unidades; cota padrão 10.000/dia)
 *  5. dry-run por padrão: só envia com --real E credenciais OAuth presentes
 * Privacidade padrão: "private" com publishAt (agendamento) — nunca "public" direto.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { env } from '../../core/config.js';
import type { Repo } from '../../core/db.js';
import type { GateResult, Script } from '../../core/types.js';
import { shortMetadata } from '../g-seo/seo.js';

const QUOTA_DAILY = Number(process.env.YOUTUBE_QUOTA_DAILY ?? 10_000);
const COST_INSERT = 1600;

export interface PublishOutcome {
  status: 'BLOQUEADO' | 'DRY_RUN_OK' | 'ENVIADO' | 'DUPLICADO' | 'ERRO';
  reasons: string[];
  remoteId?: string;
}

export async function publishVideo(repo: Repo, script: Script, opts: { dryRun: boolean; publishAt?: string }): Promise<PublishOutcome> {
  const renderId = `${script.id}-v${script.version}`;
  const render = repo.get<{ file: string }>('render', renderId);
  const reasons: string[] = [];
  if (!render || !existsSync(render.file)) return { status: 'BLOQUEADO', reasons: [`render ${renderId} inexistente`] };
  if (!repo.isApproved('render', renderId)) reasons.push(`sem aprovação humana para ${renderId} (versão ${repo.version('render', renderId)})`);
  for (const g of ['FATOS', 'CRIATIVIDADE', 'AUDIOVISUAL'] as const) {
    const gr = repo.get<GateResult>('gate', `${script.id}:${g}`);
    if (!gr?.passed) reasons.push(`gate ${g} ${gr ? 'reprovado' : 'não executado'}`);
  }
  const hash = createHash('sha256').update(readFileSync(render.file)).digest('hex');
  const dup = repo.db.prepare('SELECT remote_id, status FROM publish_ledger WHERE content_hash=?').get(hash) as { remote_id: string; status: string } | undefined;
  if (dup) return { status: 'DUPLICADO', reasons: [`já enviado (${dup.status}) como ${dup.remote_id}`] };
  const day = new Date().toISOString().slice(0, 10);
  const used = (repo.db.prepare('SELECT COALESCE(SUM(units),0) AS u FROM quota_ledger WHERE day=? AND api=?').get(day, 'youtube') as { u: number }).u;
  if (used + COST_INSERT > QUOTA_DAILY) reasons.push(`quota insuficiente: usado ${used}/${QUOTA_DAILY}`);
  if (reasons.length) {
    repo.log('publish', 'warn', 'publicação bloqueada', { renderId, reasons });
    return { status: 'BLOQUEADO', reasons };
  }

  const meta = shortMetadata(script);
  const body = {
    snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: '20', defaultLanguage: 'pt-BR', defaultAudioLanguage: 'pt-BR' },
    status: { privacyStatus: 'private', ...(opts.publishAt ? { publishAt: opts.publishAt } : {}), selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
  };
  if (opts.dryRun || !env.youtubeTokenFile) {
    return { status: 'DRY_RUN_OK', reasons: [opts.dryRun ? 'dry-run (use --real para enviar)' : 'YOUTUBE_TOKEN_FILE não configurado', `payload: ${JSON.stringify(body).slice(0, 300)}…`] };
  }

  // ---- envio real (OAuth 2.0, escopo youtube.upload). Token obtido fora do código, via fluxo OAuth do Google. ----
  try {
    const token = JSON.parse(readFileSync(env.youtubeTokenFile, 'utf8')).access_token as string;
    const size = statSync(render.file).size;
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-length': String(size), 'x-upload-content-type': 'video/mp4' },
      body: JSON.stringify(body),
    });
    if (!init.ok) throw new Error(`init ${init.status}: ${await init.text()}`);
    const location = init.headers.get('location')!;
    repo.db.prepare('INSERT INTO quota_ledger(day,api,units,op,at) VALUES (?,?,?,?,?)').run(day, 'youtube', COST_INSERT, 'videos.insert', new Date().toISOString());
    const up = await fetch(location, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: readFileSync(render.file) });
    if (!up.ok) throw new Error(`upload ${up.status}: ${await up.text()}`);
    const { id } = (await up.json()) as { id: string };
    repo.db.prepare('INSERT INTO publish_ledger(content_hash,entity_id,platform,remote_id,status,at) VALUES (?,?,?,?,?,?)').run(hash, renderId, 'youtube', id, 'private', new Date().toISOString());
    repo.log('publish', 'info', 'enviado como privado', { renderId, id });
    return { status: 'ENVIADO', reasons: ['enviado como PRIVADO'], remoteId: id };
  } catch (e) {
    repo.log('publish', 'error', 'falha no upload', String(e));
    return { status: 'ERRO', reasons: [String(e)] };
  }
}
