import { useEffect, useRef, useState } from "react";
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  session: Session;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function SessionItem({
  session,
  active,
  onSelect,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const t = draft.trim();
    if (t && t !== session.title) onRename(t);
    else setDraft(session.title);
    setEditing(false);
  }

  function cancel() {
    setDraft(session.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <SidebarMenuItem>
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className="h-7"
          />
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-7 shrink-0"
            onClick={commit}
          >
            <Check />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-7 shrink-0"
            onClick={cancel}
          >
            <X />
          </Button>
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        onClick={onSelect}
        tooltip={session.title}
      >
        <MessageSquare />
        <span className="flex-1 truncate">{session.title}</span>
      </SidebarMenuButton>
      {/* Action group — same hover-reveal as SidebarMenuAction showOnHover.
          SidebarMenuItem already provides group/menu-item + relative. */}
      <div
        className={cn(
          "absolute top-1.5 right-1 flex items-center gap-0.5",
          "md:opacity-0 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100",
          "group-data-[collapsible=icon]:hidden",
        )}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            setDraft(session.title);
            setEditing(true);
          }}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`删除会话「${session.title}」？`)) onDelete();
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </SidebarMenuItem>
  );
}
