// ============================================================
// Quay — Database Connection (bun:sqlite — native Bun driver)
// ============================================================
// NOTE: bun:sqlite is Bun's native SQLite driver. It does NOT
// require better-sqlite3. This replaces the Drizzle+better-sqlite3
// approach with raw bun:sqlite for execution + Drizzle schema
// for type safety and future ORM migration path.
// ============================================================

import { Database, type Statement } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.QUAY_DB_PATH ?? './quay.db';

// Ensure directory exists
const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ── Thin query builder using bun:sqlite ───────────────────────
// Provides drizzle-orm-compatible query interface via bun:sqlite
// NOTE: orderBy is whitelist-validated to prevent SQL injection.

type TableName = 'projects' | 'agents' | 'tasks' | 'runs' | 'step_attempts' | 'sandboxes' | 'audit_events' | 'transitions' | 'scheduler_decisions';

const ALLOWED_ORDER_COLUMNS: Set<string> = new Set([
  'id', 'created_at', 'updated_at', 'name', 'state', 'priority',
  'started_at', 'completed_at', 'timestamp',
]);

function isValidOrderBy(col: string): boolean {
  return ALLOWED_ORDER_COLUMNS.has(col);
}

function whereClause(conditions: Record<string, unknown> | undefined): { sql: string; params: unknown[] } {
  if (!conditions || Object.keys(conditions).length === 0) return { sql: '', params: [] };
  const entries = Object.entries(conditions);
  const sql = ' WHERE ' + entries.map(([k]) => `${k} = ?`).join(' AND ');
  const params = entries.map(([, v]) => v);
  return { sql, params };
}

export const dbq = {
  insert(tableName: TableName, data: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(data);
    const cols = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => data[k]);
    const sql = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`;
    db.prepare(sql).run(...values);
    return data;
  },

  select<T extends Record<string, unknown>>(tableName: TableName, conditions?: Partial<T>, orderBy?: string, limit?: number): T[] {
    const { sql: whereSql, params: whereParams } = whereClause(conditions as Record<string, unknown>);
    // Whitelist validation for orderBy — prevent SQL injection
    const order = orderBy && isValidOrderBy(orderBy) ? ` ORDER BY ${orderBy}` : '';
    // Validate limit is a positive integer
    const lim = (limit !== undefined && Number.isInteger(limit) && limit > 0) ? ` LIMIT ${limit}` : '';
    const finalSql = `SELECT * FROM ${tableName}${whereSql}${order}${lim}`;
    return db.prepare(finalSql).all(...whereParams) as T[];
  },

  update(tableName: TableName, data: Record<string, unknown>, conditions: Record<string, unknown>): void {
    const setKeys = Object.keys(data);
    const whereKeys = Object.keys(conditions);
    const setSql = setKeys.map(k => `${k} = ?`).join(', ');
    const whereSql = whereKeys.map(k => `${k} = ?`).join(' AND ');
    const values = [...setKeys.map(k => data[k]), ...whereKeys.map(k => conditions[k])];
    db.prepare(`UPDATE ${tableName} SET ${setSql} WHERE ${whereSql}`).run(...values);
  },

  delete(tableName: TableName, conditions: Record<string, unknown>): void {
    const { sql: whereSql, params: whereParams } = whereClause(conditions);
    db.prepare(`DELETE FROM ${tableName}${whereSql}`).run(...whereParams);
  },

  // Run raw SQL (for migrations, custom queries)
  exec(sql: string) { db.exec(sql); },

  // Get the raw Database instance
  raw(): Database { return db; },
};

// ── Initialize tables ─────────────────────────────────────────

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repo_url TEXT,
      description TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OFFLINE',
      capacity INTEGER NOT NULL DEFAULT 1,
      pool_size INTEGER NOT NULL DEFAULT 1,
      config TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT 'BACKLOG',
      priority INTEGER NOT NULL DEFAULT 5,
      scheduling_policy TEXT NOT NULL DEFAULT 'FAIR_SHARE',
      assigned_agent_id TEXT,
      correlation_id TEXT,
      parent_task_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'PENDING',
      correlation_id TEXT,
      sandbox_id TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      error TEXT,
      cost REAL NOT NULL DEFAULT 0,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS step_attempts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      thought TEXT,
      action TEXT,
      action_args TEXT DEFAULT '{}',
      observation TEXT,
      error TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS sandboxes (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      endpoint TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      task_id TEXT,
      agent_id TEXT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      actor_id TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transitions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      from_state TEXT NOT NULL,
      to_state TEXT NOT NULL,
      triggered_by TEXT,
      event TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS scheduler_decisions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      scheduling_policy TEXT NOT NULL,
      priority INTEGER NOT NULL,
      queue_position INTEGER NOT NULL,
      reason TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
    CREATE INDEX IF NOT EXISTS idx_runs_task ON runs(task_id);
    CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state);
    CREATE INDEX IF NOT EXISTS idx_audit_run ON audit_events(run_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp);
  `);
}

// Auto-init on import
initDB();


