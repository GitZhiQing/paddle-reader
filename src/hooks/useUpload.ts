import { useCallback } from "react";
import { useSession } from "@/state/SessionContext";
import { fileTypeFor, isAcceptedFile, parseDocument } from "@/lib/ocr";
import type { Attachment, ParseResult } from "@/lib/types";

interface UploadableFile {
  path: string;
  name: string;
}

// ── auto-rename helpers ──

/**
 * Extract the first non-empty line of markdown, strip common formatting tokens
 * (#, **, *, `, links, images), and truncate to at most `max` words.
 * "Word" = one CJK character or one English/alphanumeric token. Returns null
 * when no usable text is found.
 */
function extractSessionTitle(markdown: string, max = 15): string | null {
  const firstLine = markdown
    .split("\n")
    .find((l) => l.trim().length > 0)
    ?.trim();
  if (!firstLine) return null;

  const clean = firstLine
    .replace(/^#+\s*/, "") // heading marker
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .trim();

  if (!clean) return null;

  return truncateWords(clean, max);
}

/** Iterate the string character by character; count one CJK char or one English
 *  token as one "word". Preserve the text structure while limiting to `max`. */
function truncateWords(text: string, max: number): string {
  const chars = [...text];
  let result = "";
  let wordCount = 0;
  let i = 0;
  const isCJK = (ch: string) =>
    /[一-鿿㐀-䶿　-〿＀-￯]/.test(ch);
  const isWordChar = (ch: string) => /[a-zA-Z0-9]/.test(ch);

  while (i < chars.length && wordCount < max) {
    const ch = chars[i];
    if (isCJK(ch)) {
      result += ch;
      wordCount++;
      i++;
    } else if (isWordChar(ch)) {
      // consume a full English token as one word
      let token = "";
      while (i < chars.length && isWordChar(chars[i])) {
        token += chars[i];
        i++;
      }
      result += token;
      wordCount++;
    } else {
      // punctuation / whitespace — pass through without counting
      result += ch;
      i++;
    }
  }
  result = result.trim();
  if (wordCount >= max && i < chars.length) result += "…";
  return result;
}

// ── hook ──

/**
 * Orchestrates a batch upload: creates a batch + N pending attachments, then
 * parses each file sequentially. When the *first* attachment in the session
 * completes, the first line of its markdown is used as the session title.
 */
export function useUpload() {
  const {
    createBatch,
    addAttachment,
    setAttachmentStatus,
    activeSessionId,
    sessions,
    renameSession,
  } = useSession();

  const parseOne = useCallback(
    async (
      att: Attachment,
      path: string,
    ): Promise<ParseResult | null> => {
      try {
        await setAttachmentStatus(att.id, "uploading");
        await setAttachmentStatus(att.id, "parsing");
        console.log(`[useUpload] parsing: ${att.file_name} (id=${att.id})`);
        const result = await parseDocument(
          path,
          fileTypeFor(att.file_name),
          att.id,
        );
        await setAttachmentStatus(att.id, "done", {
          markdown: result.markdown,
          pageCount: result.page_count,
        });
        console.log(
          `[useUpload] done: ${att.file_name}, ${result.page_count} pages`,
        );
        return result;
      } catch (e) {
        console.error(`[useUpload] error on ${att.file_name}:`, e);
        await setAttachmentStatus(att.id, "error", {
          errorMsg: String(e),
        });
        return null;
      }
    },
    [setAttachmentStatus],
  );

  const uploadFiles = useCallback(
    async (files: UploadableFile[]): Promise<void> => {
      const accepted = files.filter((f) => isAcceptedFile(f.name));
      if (accepted.length === 0) {
        console.warn("[useUpload] no accepted files");
        return;
      }

      const batch = await createBatch();
      if (!batch) {
        throw new Error("无法创建批次：会话尚未就绪，请稍后重试");
      }

      const created: (Attachment | null)[] = [];
      for (const f of accepted) {
        try {
          const att = await addAttachment(
            batch.id,
            f.name,
            fileTypeFor(f.name),
            0,
            f.path,
          );
          created.push(att);
        } catch (e) {
          console.error(
            `[useUpload] failed to create attachment for ${f.name}:`,
            e,
          );
          created.push(null);
        }
      }

      const session = sessions.find((s) => s.id === activeSessionId);
      let autoRenamed = session?.title !== "新会话"; // already renamed?
      for (let i = 0; i < created.length; i++) {
        const att = created[i];
        if (!att) continue;
        const result = await parseOne(att, accepted[i].path);
        if (!autoRenamed && result && activeSessionId) {
          const title = extractSessionTitle(result.markdown);
          if (title) {
            await renameSession(activeSessionId, title);
            autoRenamed = true;
          }
        }
      }
    },
    [createBatch, addAttachment, parseOne, activeSessionId, sessions, renameSession],
  );

  const retryAttachment = useCallback(
    async (att: Attachment) => {
      await parseOne(att, att.file_path);
    },
    [parseOne],
  );

  return { uploadFiles, retryAttachment };
}
