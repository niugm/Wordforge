import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WORD_COUNT_MODE_LABELS, type WordCountMode } from "@/lib/wordCount";
import { useUIStore, type EditorFontFamily } from "@/store/useUIStore";

const FONT_OPTIONS: Array<{ value: EditorFontFamily; label: string }> = [
  { value: "sans", label: "无衬线" },
  { value: "serif", label: "衬线" },
  { value: "mono", label: "等宽" },
];

const WORD_COUNT_OPTIONS: Array<{ value: WordCountMode; label: string; description: string }> = [
  {
    value: "characters",
    label: WORD_COUNT_MODE_LABELS.characters,
    description: "按可见字符计数，保留标点。",
  },
  {
    value: "noSpaces",
    label: WORD_COUNT_MODE_LABELS.noSpaces,
    description: "忽略空格和换行。",
  },
  {
    value: "mixedWords",
    label: WORD_COUNT_MODE_LABELS.mixedWords,
    description: "中文按字，英文按词。",
  },
];

export function SettingsDialog() {
  const open = useUIStore((s) => s.settingsOpen);
  const setSettings = useUIStore((s) => s.setSettings);
  const editorPreferences = useUIStore((s) => s.editorPreferences);
  const setEditorPreferences = useUIStore((s) => s.setEditorPreferences);
  const resetEditorPreferences = useUIStore((s) => s.resetEditorPreferences);
  const wordCountMode = useUIStore((s) => s.wordCountMode);
  const setWordCountMode = useUIStore((s) => s.setWordCountMode);

  return (
    <Dialog open={open} onOpenChange={setSettings}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>外观 / AI / 备份 / 字数计数</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="appearance">
          <TabsList>
            <TabsTrigger value="appearance">外观</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="backup">备份</TabsTrigger>
            <TabsTrigger value="counting">字数</TabsTrigger>
          </TabsList>
          <TabsContent value="appearance" className="py-4 text-sm text-muted-foreground">
            <div className="space-y-5 text-foreground">
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">编辑器偏好</h3>
                  <p className="text-xs text-muted-foreground">
                    调整正文排版，不影响已保存内容。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="字体" htmlFor="editor-font">
                    <select
                      id="editor-font"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={editorPreferences.fontFamily}
                      onChange={(e) =>
                        setEditorPreferences({ fontFamily: e.target.value as EditorFontFamily })
                      }
                    >
                      {FONT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="编辑区宽度" htmlFor="editor-measure">
                    <Input
                      id="editor-measure"
                      type="number"
                      min={560}
                      max={1100}
                      step={20}
                      value={editorPreferences.measure}
                      onChange={(e) =>
                        setEditorPreferences({
                          measure: clampNumber(e.target.valueAsNumber, 560, 1100, 760),
                        })
                      }
                    />
                  </Field>

                  <Field
                    label={`字号 ${editorPreferences.fontSize}px`}
                    htmlFor="editor-font-size"
                  >
                    <input
                      id="editor-font-size"
                      type="range"
                      min={13}
                      max={22}
                      step={1}
                      value={editorPreferences.fontSize}
                      onChange={(e) =>
                        setEditorPreferences({
                          fontSize: clampNumber(e.target.valueAsNumber, 13, 22, 15),
                        })
                      }
                      className="w-full"
                    />
                  </Field>

                  <Field
                    label={`行高 ${editorPreferences.lineHeight.toFixed(2)}`}
                    htmlFor="editor-line-height"
                  >
                    <input
                      id="editor-line-height"
                      type="range"
                      min={1.4}
                      max={2.2}
                      step={0.05}
                      value={editorPreferences.lineHeight}
                      onChange={(e) =>
                        setEditorPreferences({
                          lineHeight: clampNumber(e.target.valueAsNumber, 1.4, 2.2, 1.75),
                        })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>
              </section>

              <Preview />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={resetEditorPreferences}>
                  恢复默认
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
          <TabsContent value="ai" className="py-4 text-sm text-muted-foreground">
            TODO: F12 设置 — provider 配置（OpenAI / Anthropic / Gemini）、密钥、base_url、模型
          </TabsContent>
          <TabsContent value="backup" className="py-4 text-sm text-muted-foreground">
            TODO: F14 自动备份 — 备份目录、自动备份开关
          </TabsContent>
          <TabsContent value="counting" className="py-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">字数计数模式</h3>
                <p className="text-xs text-muted-foreground">
                  影响编辑器实时字数、保存到章节的字数和写作会话增量。
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {WORD_COUNT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-md border p-3 text-left text-sm transition-colors ${
                      wordCountMode === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent"
                    }`}
                    onClick={() => setWordCountMode(option.value)}
                  >
                    <span className="block font-medium">{option.label}</span>
                    <span
                      className={`mt-1 block text-xs ${
                        wordCountMode === option.value
                          ? "text-primary-foreground/75"
                          : "text-muted-foreground"
                      }`}
                    >
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Preview() {
  const prefs = useUIStore((s) => s.editorPreferences);
  const fontClass =
    prefs.fontFamily === "serif"
      ? "font-serif"
      : prefs.fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  return (
    <section className="rounded-md border bg-background p-4">
      <p className="text-xs text-muted-foreground">预览</p>
      <div
        className={`mx-auto mt-3 ${fontClass}`}
        style={{
          maxWidth: prefs.measure,
          fontSize: prefs.fontSize,
          lineHeight: prefs.lineHeight,
        }}
      >
        <p>雨停以后，城墙下的灯一盏盏亮起来。</p>
        <p className="text-muted-foreground">
          她把未写完的章节折进夜色里，只留下一个足够清晰的下一步。
        </p>
      </div>
    </section>
  );
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
