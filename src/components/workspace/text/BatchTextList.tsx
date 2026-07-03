import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSession } from "@/state/SessionContext";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { MarkdownBlock } from "./MarkdownBlock";

export type ViewMode = "rendered" | "raw";

interface Props {
  mode: ViewMode;
}

function RawBlock({ markdown }: { markdown: string }) {
  return (
    <div className="relative group">
      <pre className="text-xs font-mono whitespace-pre-wrap bg-muted rounded-md p-4 pr-10 overflow-auto max-h-96">
        {markdown}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
        title="复制"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(markdown);
            toast.success("已复制");
          } catch {
            toast.error("复制失败");
          }
        }}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

/**
 * Render each batch's parsed markdown top-to-bottom. Within a batch, multiple attachments
 * concatenate; batches are separated by a divider.
 * - "rendered" → react-markdown pipeline
 * - "raw"       → monospace <pre> block with per-block copy button
 */
export function BatchTextList({ mode }: Props) {
  const { batches, attachmentsByBatch } = useSession();

  return (
    <div className="flex flex-col gap-6">
      {batches.map((b, i) => {
        const atts = (attachmentsByBatch[b.id] ?? []).filter(
          (a) => a.status === "done" && a.markdown,
        );
        if (atts.length === 0) return null;
        return (
          <div key={b.id} className="flex flex-col gap-4">
            {i > 0 && <Separator />}
            {atts.map((a) =>
              mode === "raw" ? (
                <RawBlock key={a.id} markdown={a.markdown!} />
              ) : (
                <MarkdownBlock key={a.id} markdown={a.markdown!} />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
