import { Separator } from "@/components/ui/separator";
import type { Attachment } from "@/lib/types";
import { AttachmentRow } from "./AttachmentRow";

interface Props {
  attachments: Attachment[];
  /** Show a divider above this batch when it's not the first. */
  showDivider: boolean;
  index: number;
}

export function BatchGroup({ attachments, showDivider, index }: Props) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {showDivider && (
        <div className="flex items-center gap-2 pt-1">
          <Separator className="flex-1" />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            #{index + 1}
          </span>
          <Separator className="flex-1" />
        </div>
      )}
      {attachments.map((a) => (
        <AttachmentRow key={a.id} attachment={a} />
      ))}
    </div>
  );
}
