import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as db from "@/lib/db";
import type { Attachment, Batch, Session } from "@/lib/types";
import { toast } from "sonner";

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  batches: Batch[];
  /** attachments keyed by batch id */
  attachmentsByBatch: Record<string, Attachment[]>;
  loading: boolean;
}

interface SessionContextValue extends SessionState {
  // session ops
  createSession: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  // batch / attachment ops
  createBatch: () => Promise<Batch | null>;
  addAttachment: (
    batchId: string,
    fileName: string,
    fileType: number,
    byteSize: number,
    filePath: string,
  ) => Promise<Attachment | null>;
  setAttachmentStatus: (
    id: string,
    status: AttachmentStatusValue,
    extra?: {
      errorMsg?: string | null;
      pageCount?: number | null;
      markdown?: string | null;
    },
  ) => Promise<void>;
  deleteAttachment: (id: string) => Promise<void>;
}

type AttachmentStatusValue =
  | "pending"
  | "uploading"
  | "parsing"
  | "done"
  | "error";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [attachmentsByBatch, setAttachmentsByBatch] = useState<
    Record<string, Attachment[]>
  >({});
  const [loading, setLoading] = useState(true);

  // ── helpers ──

  const refreshSessions = useCallback(async () => {
    const list = await db.listSessions();
    setSessions(list);
    return list;
  }, []);

  const loadSessionContent = useCallback(async (sessionId: string) => {
    const [bs, atts] = await Promise.all([
      db.listBatches(sessionId),
      db.listSessionAttachments(sessionId),
    ]);
    setBatches(bs);
    const map: Record<string, Attachment[]> = {};
    for (const a of atts) {
      (map[a.batch_id] ??= []).push(a);
    }
    setAttachmentsByBatch(map);
  }, []);

  // ── initialise / auto-session ──

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await refreshSessions();
        if (cancelled) return;
        if (list.length === 0) {
          await db.createSession();
          if (cancelled) return;
          list = await refreshSessions();
        }
        if (cancelled) return;
        const first = list[0];
        setActiveSessionId(first.id);
        await loadSessionContent(first.id);
      } catch (e) {
        console.error("[SessionProvider] init failed:", e);
        toast.error("初始化失败", { description: String(e) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshSessions, loadSessionContent]);

  // ── session ops ──

  const selectSession = useCallback(
    async (id: string) => {
      setActiveSessionId(id);
      try {
        await loadSessionContent(id);
      } catch (e) {
        console.error("[SessionProvider] selectSession failed:", e);
      }
    },
    [loadSessionContent],
  );

  const createSession = useCallback(async () => {
    try {
      const s = await db.createSession();
      await refreshSessions();
      await selectSession(s.id);
    } catch (e) {
      console.error("[SessionProvider] createSession failed:", e);
      toast.error("创建会话失败", { description: String(e) });
    }
  }, [refreshSessions, selectSession]);

  const renameSession = useCallback(
    async (id: string, title: string) => {
      try {
        await db.renameSession(id, title);
        await refreshSessions();
      } catch (e) {
        console.error("[SessionProvider] renameSession failed:", e);
      }
    },
    [refreshSessions],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        await db.deleteSession(id);
        let list = await refreshSessions();
        if (list.length === 0) {
          await db.createSession();
          list = await refreshSessions();
        }
        const next = list[0];
        setActiveSessionId(next.id);
        await loadSessionContent(next.id);
      } catch (e) {
        console.error("[SessionProvider] deleteSession failed:", e);
      }
    },
    [refreshSessions, loadSessionContent],
  );

  // ── batch / attachment ops ──

  const createBatch = useCallback(async (): Promise<Batch | null> => {
    if (!activeSessionId) {
      console.error("[SessionProvider] createBatch: activeSessionId is null");
      return null;
    }
    const b = await db.createBatch(activeSessionId);
    setBatches((prev) => [...prev, b]);
    setAttachmentsByBatch((prev) => ({ ...prev, [b.id]: [] }));
    await refreshSessions();
    return b;
  }, [activeSessionId, refreshSessions]);

  const addAttachment = useCallback(
    async (
      batchId: string,
      fileName: string,
      fileType: number,
      byteSize: number,
      filePath: string,
    ): Promise<Attachment | null> => {
      const a = await db.createAttachment(
        batchId,
        fileName,
        fileType,
        byteSize,
        filePath,
      );
      setAttachmentsByBatch((prev) => ({
        ...prev,
        [batchId]: [...(prev[batchId] ?? []), a],
      }));
      return a;
    },
    [],
  );

  const setAttachmentStatus = useCallback(
    async (
      id: string,
      status: AttachmentStatusValue,
      extra?: {
        errorMsg?: string | null;
        pageCount?: number | null;
        markdown?: string | null;
      },
    ) => {
      await db.updateAttachmentStatus(id, status, extra);
      setAttachmentsByBatch((prev) => {
        const next: Record<string, Attachment[]> = {};
        for (const [bid, list] of Object.entries(prev)) {
          next[bid] = list.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  error_msg: extra?.errorMsg ?? a.error_msg,
                  page_count: extra?.pageCount ?? a.page_count,
                  markdown: extra?.markdown ?? a.markdown,
                  updated_at: Date.now(),
                }
              : a,
          );
        }
        return next;
      });
    },
    [],
  );

  const deleteAttachment = useCallback(async (id: string) => {
    await db.deleteAttachment(id);
    setAttachmentsByBatch((prev) => {
      const next: Record<string, Attachment[]> = {};
      for (const [bid, list] of Object.entries(prev)) {
        next[bid] = list.filter((a) => a.id !== id);
      }
      return next;
    });
  }, []);

  // ── context value ──

  const value = useMemo<SessionContextValue>(
    () => ({
      sessions,
      activeSessionId,
      batches,
      attachmentsByBatch,
      loading,
      createSession,
      selectSession,
      renameSession,
      deleteSession,
      createBatch,
      addAttachment,
      setAttachmentStatus,
      deleteAttachment,
    }),
    [
      sessions,
      activeSessionId,
      batches,
      attachmentsByBatch,
      loading,
      createSession,
      selectSession,
      renameSession,
      deleteSession,
      createBatch,
      addAttachment,
      setAttachmentStatus,
      deleteAttachment,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
