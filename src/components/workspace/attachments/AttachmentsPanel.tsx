import { BatchList } from "./BatchList";
import { ClipboardPaste } from "./ClipboardPaste";
import { UploadForm } from "./UploadForm";

interface Props {
  onNeedSettings: () => void;
}

export function AttachmentsPanel({ onNeedSettings }: Props) {
  return (
    <div className="flex flex-1 flex-col bg-card min-w-0 overflow-hidden">
      <div className="flex h-9 shrink-0 items-center border-b border-border px-3 text-xs font-medium text-muted-foreground">
        附件
      </div>
      <BatchList />
      <ClipboardPaste />
      <UploadForm onNeedSettings={onNeedSettings} />
    </div>
  );
}
