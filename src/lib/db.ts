import Database from "@tauri-apps/plugin-sql";
import type { Attachment, Batch, Session } from "./types";

const DB_FILE = "sqlite:paddle-reader.db";

let dbPromise: Promise<Database> | null = null;

/** Lazily load the SQLite database and ensure the schema exists. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load(DB_FILE);
      await db.execute("PRAGMA foreign_keys = ON");
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id          TEXT PRIMARY KEY,
          title       TEXT NOT NULL,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS batches (
          id          TEXT PRIMARY KEY,
          session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          position    INTEGER NOT NULL,
          created_at  INTEGER NOT NULL,
          UNIQUE (session_id, position)
        );
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS attachments (
          id          TEXT PRIMARY KEY,
          batch_id    TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
          file_name   TEXT NOT NULL,
          file_type   INTEGER NOT NULL,
          byte_size   INTEGER NOT NULL,
          file_path   TEXT NOT NULL,
          status      TEXT NOT NULL,
          error_msg   TEXT,
          page_count  INTEGER,
          markdown    TEXT,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );
      `);
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_batches_session ON batches(session_id, position);`,
      );
      await db.execute(
        `CREATE INDEX IF NOT EXISTS idx_attachments_batch ON attachments(batch_id);`,
      );
      return db;
    })();
  }
  return dbPromise;
}

const now = () => Date.now();

// ---- sessions ----

export async function listSessions(): Promise<Session[]> {
  const db = await getDb();
  return db.select<Session[]>(
    "SELECT * FROM sessions ORDER BY updated_at DESC, created_at DESC",
  );
}

export async function createSession(title = "新会话"): Promise<Session> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const ts = now();
  await db.execute(
    "INSERT INTO sessions (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)",
    [id, title, ts, ts],
  );
  return { id, title, created_at: ts, updated_at: ts };
}

export async function renameSession(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE sessions SET title = $1, updated_at = $2 WHERE id = $3",
    [title, now(), id],
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}

export async function touchSession(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sessions SET updated_at = $1 WHERE id = $2", [
    now(),
    id,
  ]);
}

// ---- batches ----

export async function listBatches(sessionId: string): Promise<Batch[]> {
  const db = await getDb();
  return db.select<Batch[]>(
    "SELECT * FROM batches WHERE session_id = $1 ORDER BY position ASC",
    [sessionId],
  );
}

export async function createBatch(sessionId: string): Promise<Batch> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const ts = now();
  // next position = current max + 1
  const rows = await db.select<{ pos: number | null }[]>(
    "SELECT MAX(position) AS pos FROM batches WHERE session_id = $1",
    [sessionId],
  );
  const position = (rows[0]?.pos ?? -1) + 1;
  await db.execute(
    "INSERT INTO batches (id, session_id, position, created_at) VALUES ($1, $2, $3, $4)",
    [id, sessionId, position, ts],
  );
  await touchSession(sessionId);
  return { id, session_id: sessionId, position, created_at: ts };
}

// ---- attachments ----

export async function listAttachments(batchId: string): Promise<Attachment[]> {
  const db = await getDb();
  return db.select<Attachment[]>(
    "SELECT * FROM attachments WHERE batch_id = $1 ORDER BY created_at ASC",
    [batchId],
  );
}

export async function listSessionAttachments(
  sessionId: string,
): Promise<Attachment[]> {
  const db = await getDb();
  return db.select<Attachment[]>(
    `SELECT a.* FROM attachments a
     JOIN batches b ON a.batch_id = b.id
     WHERE b.session_id = $1
     ORDER BY b.position ASC, a.created_at ASC`,
    [sessionId],
  );
}

export async function createAttachment(
  batchId: string,
  fileName: string,
  fileType: number,
  byteSize: number,
  filePath: string,
): Promise<Attachment> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const ts = now();
  await db.execute(
    `INSERT INTO attachments
       (id, batch_id, file_name, file_type, byte_size, file_path, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)`,
    [id, batchId, fileName, fileType, byteSize, filePath, ts, ts],
  );
  return {
    id,
    batch_id: batchId,
    file_name: fileName,
    file_type: fileType,
    byte_size: byteSize,
    file_path: filePath,
    status: "pending",
    error_msg: null,
    page_count: null,
    markdown: null,
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateAttachmentStatus(
  id: string,
  status: AttachmentStatusForDb,
  extra?: { errorMsg?: string | null; pageCount?: number | null; markdown?: string | null },
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE attachments
       SET status = $1,
           error_msg = COALESCE($2, error_msg),
           page_count = COALESCE($3, page_count),
           markdown = COALESCE($4, markdown),
           updated_at = $5
     WHERE id = $6`,
    [
      status,
      extra?.errorMsg ?? null,
      extra?.pageCount ?? null,
      extra?.markdown ?? null,
      now(),
      id,
    ],
  );
}
type AttachmentStatusForDb =
  | "pending"
  | "uploading"
  | "parsing"
  | "done"
  | "error";

export async function deleteAttachment(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM attachments WHERE id = $1", [id]);
}
