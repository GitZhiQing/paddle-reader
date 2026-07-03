import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getSettings,
  saveSettings,
  testConnection,
} from "@/lib/store";
import { DEFAULT_API_URL, PINNED_MODEL, type Settings } from "@/lib/types";

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; msg: string }
  | { kind: "err"; msg: string };

export function SettingsPage({ onBack, onSaved }: Props) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState("");
  const [model] = useState(PINNED_MODEL);
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load persisted settings into the form.
  useEffect(() => {
    getSettings()
      .then((s: Settings) => {
        setApiUrl(s.apiUrl || DEFAULT_API_URL);
        setToken(s.token || "");
      })
      .catch(() => {
        /* leave defaults */
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleTest() {
    setTest({ kind: "testing" });
    try {
      const msg = await testConnection(apiUrl.trim(), token.trim());
      setTest({ kind: "ok", msg });
    } catch (e) {
      setTest({ kind: "err", msg: String(e) });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings(apiUrl.trim(), token.trim());
      onSaved();
      onBack();
    } catch (e) {
      setTest({ kind: "err", msg: String(e) });
    } finally {
      setSaving(false);
    }
  }

  const canSave = loaded && apiUrl.trim() !== "" && token.trim() !== "";

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Button variant="ghost" size="icon" className="size-8" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-sm font-medium">设置</h1>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-xl space-y-6">
          <section className="space-y-2">
            <Label htmlFor="api-url">API URL</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={DEFAULT_API_URL}
            />
            <p className="text-xs text-muted-foreground">
              PaddleOCR 异步任务接口地址，默认填入官方端点，可按需修改。
            </p>
          </section>

          <section className="space-y-2">
            <Label htmlFor="model">指定模型</Label>
            <Input id="model" value={model} disabled />
            <p className="text-xs text-muted-foreground">
              应用固定使用此模型，不可更改。
            </p>
          </section>

          <section className="space-y-2">
            <Label htmlFor="token">Token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="粘贴你的 access token"
            />
            <p className="text-xs text-muted-foreground">
              从 AI Studio 账号的 accessToken 获取。
            </p>
          </section>

          {test.kind !== "idle" && test.kind !== "testing" && (
            <div className="flex items-center gap-2 text-sm">
              {test.kind === "ok" ? (
                <Badge variant="default" className="gap-1">
                  <ShieldCheck className="size-3.5" /> {test.msg}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <TriangleAlert className="size-3.5" /> {test.msg}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={
                test.kind === "testing" ||
                apiUrl.trim() === "" ||
                token.trim() === ""
              }
            >
              {test.kind === "testing" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              测试连接
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
