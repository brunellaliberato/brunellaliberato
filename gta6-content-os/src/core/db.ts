/**
 * Persistência. Desenvolvimento: SQLite nativo do Node (node:sqlite, zero dependências).
 * O schema usa apenas tipos portáveis (TEXT/REAL/INTEGER + JSON em TEXT) para migrar
 * para PostgreSQL (JSONB) sem mudar os módulos — eles só falam com o Repo.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { paths } from './config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS entities (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE TABLE IF NOT EXISTS entity_history (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  reason TEXT
);
CREATE TABLE IF NOT EXISTS events (
  at TEXT NOT NULL,
  module TEXT NOT NULL,
  level TEXT NOT NULL,
  msg TEXT NOT NULL,
  data TEXT
);
CREATE TABLE IF NOT EXISTS approvals (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  decision TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS publish_ledger (
  content_hash TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  remote_id TEXT,
  status TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quota_ledger (
  day TEXT NOT NULL,
  api TEXT NOT NULL,
  units INTEGER NOT NULL,
  op TEXT NOT NULL,
  at TEXT NOT NULL
);
`;

export type EntityKind = 'news' | 'pauta' | 'script' | 'render' | 'clip_job' | 'clip_candidate' | 'gate' | 'asset' | 'calendar';

export class Repo {
  readonly db: DatabaseSync;
  constructor(file = paths.db) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(SCHEMA);
  }

  get<T>(kind: EntityKind, id: string): T | null {
    const row = this.db.prepare('SELECT data FROM entities WHERE kind=? AND id=?').get(kind, id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : null;
  }

  list<T>(kind: EntityKind): T[] {
    const rows = this.db.prepare('SELECT data FROM entities WHERE kind=? ORDER BY updated_at DESC').all(kind) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  /** upsert com histórico de versões (nada é sobrescrito sem deixar rastro) */
  put<T extends { id: string }>(kind: EntityKind, obj: T, reason = 'upsert'): number {
    const now = new Date().toISOString();
    const cur = this.db.prepare('SELECT data, version FROM entities WHERE kind=? AND id=?').get(kind, obj.id) as
      | { data: string; version: number }
      | undefined;
    const data = JSON.stringify(obj);
    if (cur && cur.data === data) return cur.version;
    const version = cur ? cur.version + 1 : 1;
    if (cur) {
      this.db
        .prepare('INSERT INTO entity_history(kind,id,version,data,changed_at,reason) VALUES (?,?,?,?,?,?)')
        .run(kind, obj.id, cur.version, cur.data, now, reason);
    }
    this.db
      .prepare(
        'INSERT INTO entities(kind,id,data,version,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data, version=excluded.version, updated_at=excluded.updated_at',
      )
      .run(kind, obj.id, data, version, now);
    return version;
  }

  version(kind: EntityKind, id: string): number {
    const r = this.db.prepare('SELECT version FROM entities WHERE kind=? AND id=?').get(kind, id) as { version: number } | undefined;
    return r?.version ?? 0;
  }

  history(kind: EntityKind, id: string) {
    return this.db.prepare('SELECT version, changed_at, reason FROM entity_history WHERE kind=? AND id=? ORDER BY version').all(kind, id);
  }

  log(module: string, level: 'info' | 'warn' | 'error', msg: string, data?: unknown) {
    this.db
      .prepare('INSERT INTO events(at,module,level,msg,data) VALUES (?,?,?,?,?)')
      .run(new Date().toISOString(), module, level, msg, data === undefined ? null : JSON.stringify(data));
  }

  recordApproval(kind: EntityKind, id: string, decision: string, reviewer: string, note?: string) {
    const version = this.version(kind, id);
    if (!version) throw new Error(`${kind}/${id} não existe`);
    this.db
      .prepare('INSERT INTO approvals(kind,id,version,decision,reviewer,note,at) VALUES (?,?,?,?,?,?,?)')
      .run(kind, id, version, decision, reviewer, note ?? null, new Date().toISOString());
  }

  /** Aprovação vale só para a versão aprovada. Editou depois? Precisa aprovar de novo. */
  isApproved(kind: EntityKind, id: string): boolean {
    const version = this.version(kind, id);
    const row = this.db
      .prepare('SELECT decision FROM approvals WHERE kind=? AND id=? AND version=? ORDER BY at DESC LIMIT 1')
      .get(kind, id, version) as { decision: string } | undefined;
    return row?.decision === 'APROVADO';
  }
}
