import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSession } from "@/state/SessionContext";
import { FileCode, Eye } from "lucide-react";
import { BatchTextList } from "./BatchTextList";

export function TextPanel() {
  const { batches, attachmentsByBatch } = useSession();

  const anyDone = batches.some((b) =>
    (attachmentsByBatch[b.id] ?? []).some((a) => a.status === "done"),
  );
  const anyBusy = batches.some((b) =>
    (attachmentsByBatch[b.id] ?? []).some(
      (a) =>
        a.status === "pending" ||
        a.status === "uploading" ||
        a.status === "parsing",
    ),
  );

  return (
    <Tabs defaultValue="rendered" className="flex flex-1 flex-col min-h-0 gap-0 bg-card">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-4 text-xs font-medium text-muted-foreground">
        <span>解析结果</span>
        <div className="flex items-center gap-2">
          <TabsList variant="line">
            <TabsTrigger value="rendered">
              <Eye className="size-3.5" />
              <span className="ml-1">渲染</span>
            </TabsTrigger>
            <TabsTrigger value="raw">
              <FileCode className="size-3.5" />
              <span className="ml-1">原始</span>
            </TabsTrigger>
          </TabsList>
          {anyBusy && <span className="text-primary">解析中…</span>}
        </div>
      </div>

      {anyDone ? (
        <>
          <TabsContent value="rendered" className="flex-1 min-h-0">
            <ScrollArea className="size-full">
              <div className="mx-auto max-w-3xl px-6 py-6">
                <BatchTextList mode="rendered" />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="raw" className="flex-1 min-h-0">
            <ScrollArea className="size-full">
              <div className="mx-auto max-w-3xl px-6 py-6">
                <BatchTextList mode="raw" />
              </div>
            </ScrollArea>
          </TabsContent>
        </>
      ) : (
        <div className="flex-1 min-h-0">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center text-sm text-muted-foreground">
            上传文件后，解析结果将显示在此处
          </div>
        </div>
      )}
    </Tabs>
  );
}
