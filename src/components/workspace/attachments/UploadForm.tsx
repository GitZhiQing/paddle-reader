import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/webview";
import type { Event } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useUpload } from "@/hooks/useUpload";
import { hasCredentials } from "@/lib/store";
import { isAcceptedFile } from "@/lib/ocr";
import { cn } from "@/lib/utils";

interface Props {
  onNeedSettings: () => void;
}

export function UploadForm({ onNeedSettings }: Props) {
  const { uploadFiles } = useUpload();
  const [hover, setHover] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Re-check credentials when the form mounts.
  useEffect(() => {
    hasCredentials().then(setConfigured);
  }, []);

  // Keep a ref of `configured` and `busy` so the async drop handler reads the latest value.
  const configuredRef = useRef(configured);
  useEffect(() => { configuredRef.current = configured; }, [configured]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const processFiles = useCallback(
    async (files: { path: string; name: string }[]) => {
      if (!configuredRef.current) {
        onNeedSettings();
        return;
      }
      if (busyRef.current) return;
      setBusy(true);
      try {
        await uploadFiles(files);
      } catch (e) {
        console.error("[UploadForm] uploadFiles failed:", e);
        toast.error("上传失败", { description: String(e) });
      } finally {
        setBusy(false);
      }
    },
    [uploadFiles, onNeedSettings],
  );

  // Listen for native file drag-drop (runs once — no dependency on uploadFiles).
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    win.onDragDropEvent((event: Event<DragDropEvent>) => {
      const e = event.payload;
      if (e.type === "over" || e.type === "enter") {
        setHover(true);
      } else if (e.type === "leave") {
        setHover(false);
      } else if (e.type === "drop") {
        setHover(false);
        const files = e.paths
          .filter((p: string) => isAcceptedFile(p.split(/[\\/]/).pop() ?? p))
          .map((p: string) => ({ path: p, name: p.split(/[\\/]/).pop() ?? p }));
        if (files.length === 0) return;
        void processFiles(files);
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [processFiles]);

  async function handleClick() {
    if (!configured) { onNeedSettings(); return; }
    if (busy) return;
    let selected: string | string[] | null = null;
    try {
      selected = await open({
        multiple: true,
        filters: [
          {
            name: "Documents & Images",
            extensions: ["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif"],
          },
        ],
      });
    } catch (e) {
      console.error("[UploadForm] open dialog failed:", e);
      toast.error("文件对话框打开失败", { description: String(e) });
      return;
    }
    if (!selected) return;
    const arr = Array.isArray(selected) ? selected : [selected];
    await processFiles(arr.map((p) => ({ path: p, name: p.split(/[\\/]/).pop() ?? p })));
  }

  return (
    <div className="shrink-0 border-t border-border p-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors",
          busy && "pointer-events-none opacity-60",
          hover
            ? "border-primary bg-primary/5 text-primary"
            : "border-border text-muted-foreground hover:border-primary/50",
        )}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Upload className="size-5" />
        )}
        <span className="font-medium">
          {busy
            ? "正在处理..."
            : configured
              ? "拖拽文件到此处或点击选择"
              : "未配置 API，点击前往设置"}
        </span>
        <span className="text-xs opacity-70">
          支持 PDF / PNG / JPG / WEBP / BMP / GIF
        </span>
      </button>
    </div>
  );
}
