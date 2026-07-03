import { FileText, Image as ImageIcon, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/types";
import { useUpload } from "@/hooks/useUpload";
import { useSession } from "@/state/SessionContext";

interface Props {
  attachment: Attachment;
}

const STATUS_LABEL: Record<Attachment["status"], string> = {
  pending: "等待中",
  uploading: "上传中",
  parsing: "解析中",
  done: "完成",
  error: "失败",
};

export function AttachmentRow({ attachment }: Props) {
  const { retryAttachment } = useUpload();
  const { deleteAttachment } = useSession();
  const isImage = attachment.file_type === 1;
  const busy =
    attachment.status === "pending" ||
    attachment.status === "uploading" ||
    attachment.status === "parsing";
  const deletable =
    attachment.status === "done" || attachment.status === "error";

  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm min-w-0 overflow-hidden">
      {isImage ? (
        <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <FileText className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 truncate min-w-0" title={attachment.file_name}>
        {attachment.file_name}
      </span>
      {busy && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
      {attachment.status === "done" && attachment.page_count != null && (
        <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
          {attachment.page_count} 页
        </span>
      )}
      <span
        className={
          "shrink-0 text-xs whitespace-nowrap " +
          (attachment.status === "done"
            ? "text-emerald-500"
            : attachment.status === "error"
              ? "text-destructive"
              : "text-muted-foreground")
        }
      >
        {STATUS_LABEL[attachment.status]}
      </span>
      {attachment.status === "error" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          title={attachment.error_msg ?? "重试"}
          onClick={() => retryAttachment(attachment)}
        >
          <RotateCcw className="size-3" />
        </Button>
      )}
      {deletable && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 hover:text-destructive"
          title="删除附件"
          onClick={async () => {
            await deleteAttachment(attachment.id);
            toast.success("已删除", { description: attachment.file_name });
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      )}
    </div>
  );
}
