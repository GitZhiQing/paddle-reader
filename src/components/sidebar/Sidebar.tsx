import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useTheme } from "next-themes";
import { Info, Plus, Sun, Moon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useSession } from "@/state/SessionContext";
import { SessionItem } from "./SessionItem";

/**
 * Footer: horizontal row when expanded, vertical icon stack when collapsed.
 *
 * Expanded (16rem)         Collapsed (3rem, icon mode)
 * ┌────────────────────┐   ┌─────┐
 * │ v0.1.0       ☀  ⚙ │   │  ℹ  │  ← tooltip "Paddle Reader v0.1.0"
 * └────────────────────┘   │  ☀  │
 *                          │  ⚙  │
 *                          └─────┘
 */
function SidebarFooterBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { theme, setTheme } = useTheme();
  const [version, setVersion] = useState("…");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
      {/* Expanded: version text. Collapsed: Info icon with tooltip. */}
      <span className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        v{version}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden group-data-[collapsible=icon]:inline-flex"
            aria-label={`版本 ${version}`}
          >
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Paddle Reader v{version}
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-0.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setTheme(theme === "dark" ? "light" : "dark")
              }
              aria-label="切换主题"
            >
              <Sun className="dark:hidden" />
              <Moon className="hidden dark:block" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">切换主题</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSettings}
              aria-label="配置"
            >
              <Settings />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">配置</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    sessions,
    activeSessionId,
    createSession,
    selectSession,
    renameSession,
    deleteSession,
  } = useSession();

  return (
    <UiSidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-0">
        <div className="flex h-9 items-center justify-between px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
            Paddle Reader
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => createSession()}
                aria-label="新建会话"
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">新建会话</TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  onSelect={() => selectSession(s.id)}
                  onRename={(title) => renameSession(s.id, title)}
                  onDelete={() => deleteSession(s.id)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-1">
        <SidebarFooterBar onOpenSettings={onOpenSettings} />
      </SidebarFooter>
    </UiSidebar>
  );
}
