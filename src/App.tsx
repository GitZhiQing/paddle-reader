import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Workspace } from "@/components/workspace/Workspace";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { SessionProvider, useSession } from "@/state/SessionContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { hasCredentials } from "@/lib/store";
import { Loader2 } from "lucide-react";

type View = "workspace" | "settings";

function App() {
  const [view, setView] = useState<View>("workspace");
  const [checking, setChecking] = useState(true);

  // First-run: force settings if credentials are missing.
  useEffect(() => {
    hasCredentials()
      .then((ok) => {
        if (!ok) setView("settings");
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <SidebarProvider className="flex-col h-screen w-screen overflow-hidden bg-background">
        <TitleBar />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          加载中…
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider className="flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <TitleBar />
      <Toaster richColors />
      {view === "settings" ? (
        <div className="flex-1 min-h-0">
          <SettingsPage
            onBack={() => setView("workspace")}
            onSaved={() => setView("workspace")}
          />
        </div>
      ) : (
        <SessionProvider>
          <SessionWorkspace
            onOpenSettings={() => setView("settings")}
            onNeedSettings={() => setView("settings")}
          />
        </SessionProvider>
      )}
    </SidebarProvider>
  );
}

/** Inner component that can call useSession() (must be inside SessionProvider). */
function SessionWorkspace({
  onOpenSettings,
  onNeedSettings,
}: {
  onOpenSettings: () => void;
  onNeedSettings: () => void;
}) {
  const { loading } = useSession();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" />
        正在初始化…
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar onOpenSettings={onOpenSettings} />
      <SidebarInset className="flex flex-col overflow-hidden">
        <Workspace onNeedSettings={onNeedSettings} />
      </SidebarInset>
    </div>
  );
}

export default App;
