import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { AttachmentsPanel } from "./attachments/AttachmentsPanel"
import { TextPanel } from "./text/TextPanel"

interface Props {
  onNeedSettings: () => void
}

export function Workspace({ onNeedSettings }: Props) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="flex-1">
      <ResizablePanel defaultSize="25%" minSize="15%" maxSize="45%" className="flex flex-col">
        <AttachmentsPanel onNeedSettings={onNeedSettings} />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize="75%" className="flex flex-col">
        <TextPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
