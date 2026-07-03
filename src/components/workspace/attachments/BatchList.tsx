import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/state/SessionContext";
import { BatchGroup } from "./BatchGroup";

export function BatchList() {
  const { batches, attachmentsByBatch } = useSession();

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col gap-2 p-3">
        {batches.map((b, i) => (
          <BatchGroup
            key={b.id}
            attachments={attachmentsByBatch[b.id] ?? []}
            showDivider={i > 0}
            index={i}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
