import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ClipboardPasteIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpload } from "@/hooks/useUpload";
import { cn } from "@/lib/utils";

/** Zone that accepts pasted images / PDFs from the clipboard. */
export function ClipboardPaste() {
  const { uploadFiles } = useUpload();
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    let blob: Blob | null = null;
    let name = "clipboard.png";
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        blob = item.getAsFile();
        name = `clipboard_${Date.now()}.png`;
        break;
      }
      if (item.type === "application/pdf") {
        blob = item.getAsFile();
        name = `clipboard_${Date.now()}.pdf`;
        break;
      }
    }
    if (!blob) {
      toast.warning("剪贴板中未检测到图片或 PDF");
      return;
    }

    setBusy(true);
    try {
      const buf = await blob.arrayBuffer();
      const b64 = btoa(
        Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(""),
      );
      const filePath: string = await invoke("write_temp_file", {
        name,
        data: b64,
      });
      await uploadFiles([{ path: filePath, name }]);
    } catch (e) {
      console.error("[ClipboardPaste] failed:", e);
      toast.error("粘贴失败", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={cn(
        "relative shrink-0 flex items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground cursor-pointer",
        focused && "bg-accent/50",
        busy && "pointer-events-none opacity-60",
      )}
    >
      {/* Tiny textarea captures paste events; `label` click focuses it automatically */}
      <textarea
        className="absolute inset-0 opacity-0 cursor-pointer resize-none"
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <ClipboardPasteIcon className="size-3.5" />
      )}
      <span>
        {busy
          ? "正在粘贴..."
          : focused
            ? "按 Ctrl+V 粘贴剪贴板内容（图片 / PDF）"
            : "点击此处，粘贴剪贴板中的图片 / PDF"}
      </span>
    </label>
  );
}
