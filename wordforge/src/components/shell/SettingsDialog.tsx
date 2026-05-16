import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  Bot,
  CheckCircle2,
  Check,
  ChevronDown,
  DatabaseBackup,
  FileArchive,
  FileDown,
  FileText,
  FolderOpen,
  Hash,
  KeyRound,
  Palette,
  Save,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconLabel } from "@/components/ui/icon-label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAiCredentials,
  useBackupNow,
  useBackupSettings,
  useDeleteAiCredential,
  useExportProject,
  useSaveAiCredential,
  useUpdateBackupSettings,
} from "@/hooks/useSettings";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { WORD_COUNT_MODE_LABELS, type WordCountMode } from "@/lib/wordCount";
import { useUIStore, type EditorFontFamily } from "@/store/useUIStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { AiProvider, ExportFormat, ExportMode } from "@/types/db";
import type { ExportResult } from "@/types/db";

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

const AI_PROVIDERS: Array<{
  value: AiProvider;
  label: string;
  description: string;
  baseUrlPlaceholder: string;
  modelPlaceholder: string;
}> = [
  {
    value: "openai",
    label: "OpenAI 兼容",
    description: "适配 OpenAI、DeepSeek、Kimi、通义或自部署网关。",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    modelPlaceholder: "例如 gpt-4.1-mini",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    description: "用于 Claude Messages API。",
    baseUrlPlaceholder: "https://api.anthropic.com",
    modelPlaceholder: "例如 claude-sonnet-4",
  },
  {
    value: "gemini",
    label: "Gemini",
    description: "用于 Google Gemini API。",
    baseUrlPlaceholder: "https://generativelanguage.googleapis.com/v1beta",
    modelPlaceholder: "例如 gemini-2.5-flash",
  },
];

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; description: string }> = [
  {
    value: "markdown",
    label: "Markdown",
    description: "保留标题、列表、引用、代码块和常用文本标记。",
  },
  {
    value: "plainText",
    label: "纯文本",
    description: "输出干净正文，适合投递或二次排版。",
  },
];

const EXPORT_MODE_OPTIONS: Array<{ value: ExportMode; label: string; description: string }> = [
  {
    value: "merged",
    label: "合并单文件",
    description: "整部作品导出为一个文件。",
  },
  {
    value: "chapterFiles",
    label: "按章拆分",
    description: "每个章节输出为独立文件。",
  },
];

const SETTINGS_TABS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "appearance", label: "外观", icon: Palette },
  { value: "ai", label: "AI", icon: Bot },
  { value: "backup", label: "备份", icon: DatabaseBackup },
  { value: "export", label: "导出", icon: FileDown },
  { value: "counting", label: "字数", icon: Hash },
];

export function SettingsDialog() {
  const open = useUIStore((s) => s.settingsOpen);
  const setSettings = useUIStore((s) => s.setSettings);
  const editorPreferences = useUIStore((s) => s.editorPreferences);
  const setEditorPreferences = useUIStore((s) => s.setEditorPreferences);
  const resetEditorPreferences = useUIStore((s) => s.resetEditorPreferences);
  const wordCountMode = useUIStore((s) => s.wordCountMode);
  const setWordCountMode = useUIStore((s) => s.setWordCountMode);
  const backupSettings = useBackupSettings();
  const updateBackupSettings = useUpdateBackupSettings();
  const backupNow = useBackupNow();
  const aiCredentials = useAiCredentials();
  const saveAiCredential = useSaveAiCredential();
  const deleteAiCredential = useDeleteAiCredential();
  const exportProject = useExportProject();
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const { data: projects } = useProjects();
  const currentProject = projects?.find((project) => project.id === currentProjectId) ?? null;
  const [backupDirDraft, setBackupDirDraft] = useState("");
  const [activeProvider, setActiveProvider] = useState<AiProvider>("openai");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [baseUrlDraft, setBaseUrlDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown");
  const [exportMode, setExportMode] = useState<ExportMode>("merged");
  const [exportDir, setExportDir] = useState("");
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const backupDir = backupSettings.data?.backupDir ?? "";
  const autoBackupEnabled = backupSettings.data?.autoBackupEnabled ?? false;
  const backupDirChanged = backupDirDraft.trim() !== backupDir;
  const selectedProvider = AI_PROVIDERS.find((provider) => provider.value === activeProvider)!;
  const selectedCredential = aiCredentials.data?.find(
    (credential) => credential.provider === activeProvider,
  );
  const hasCurrentApiKey = selectedCredential?.hasApiKey ?? false;
  const canSaveAiCredential =
    !aiCredentials.isLoading &&
    !saveAiCredential.isPending &&
    (hasCurrentApiKey || apiKeyDraft.trim().length > 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBackupDirDraft(backupDir);
    }, 0);
    return () => clearTimeout(timer);
  }, [backupDir]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApiKeyDraft("");
      setBaseUrlDraft(selectedCredential?.baseUrl ?? "");
      setModelDraft(selectedCredential?.model ?? "");
    }, 0);
    return () => clearTimeout(timer);
  }, [activeProvider, selectedCredential?.baseUrl, selectedCredential?.model]);

  async function chooseExportDir() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "选择导出目录",
    });
    if (typeof selected === "string") {
      setExportDir(selected);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setSettings}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription className="sr-only">
            外观 / AI / 备份 / 导出 / 字数计数
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="appearance">
          <TabsList className="grid w-full grid-cols-5">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="min-w-0">
                <IconLabel icon={tab.icon} className="min-w-0" iconClassName="h-3.5 w-3.5">
                  {tab.label}
                </IconLabel>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="appearance" className="py-4 text-sm text-muted-foreground">
            <div className="space-y-5 text-foreground">
              <section className="space-y-3">
                <SectionHeading
                  icon={Palette}
                  title="编辑器偏好"
                  description="调整正文排版，不影响已保存内容。"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="字体" htmlFor="editor-font">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          id="editor-font"
                          type="button"
                          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-sm transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <span>{fontOptionLabel(editorPreferences.fontFamily)}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {FONT_OPTIONS.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onSelect={() => setEditorPreferences({ fontFamily: option.value })}
                            className="gap-2"
                          >
                            <span className="flex h-4 w-4 items-center justify-center">
                              {editorPreferences.fontFamily === option.value && (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

                  <Field label={`字号 ${editorPreferences.fontSize}px`} htmlFor="editor-font-size">
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
          <TabsContent value="ai" className="py-4">
            <div className="space-y-4">
              <SectionHeading
                icon={Bot}
                title="AI Provider"
                description="密钥只写入本地数据库，前端仅显示是否已保存。"
              />

              <div className="grid gap-4 md:grid-cols-[190px_1fr]">
                <div className="grid gap-2">
                  {AI_PROVIDERS.map((provider) => {
                    const credential = aiCredentials.data?.find(
                      (item) => item.provider === provider.value,
                    );
                    const active = activeProvider === provider.value;

                    return (
                      <button
                        key={provider.value}
                        type="button"
                        className={cn(
                          "w-full rounded-md border p-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "bg-background hover:bg-accent/70",
                        )}
                        onClick={() => setActiveProvider(provider.value)}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Bot className="h-4 w-4" />
                            </span>
                            <span className="truncate">{provider.label}</span>
                          </span>
                          {credential?.hasApiKey ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : null}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                          {provider.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4 rounded-md border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{selectedProvider.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {hasCurrentApiKey ? "已保存密钥，留空可保留原密钥。" : "尚未保存密钥。"}
                      </p>
                    </div>
                    <Badge variant={hasCurrentApiKey ? "secondary" : "outline"}>
                      {hasCurrentApiKey ? "已配置" : "未配置"}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    <Field label="API Key" htmlFor="ai-api-key">
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="ai-api-key"
                          type="password"
                          value={apiKeyDraft}
                          onChange={(e) => setApiKeyDraft(e.target.value)}
                          placeholder={hasCurrentApiKey ? "留空保留当前密钥" : "粘贴 API key"}
                          disabled={aiCredentials.isLoading || saveAiCredential.isPending}
                          className="pl-8"
                        />
                      </div>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Base URL" htmlFor="ai-base-url">
                        <Input
                          id="ai-base-url"
                          value={baseUrlDraft}
                          onChange={(e) => setBaseUrlDraft(e.target.value)}
                          placeholder={selectedProvider.baseUrlPlaceholder}
                          disabled={aiCredentials.isLoading || saveAiCredential.isPending}
                        />
                      </Field>

                      <Field label="模型" htmlFor="ai-model">
                        <Input
                          id="ai-model"
                          value={modelDraft}
                          onChange={(e) => setModelDraft(e.target.value)}
                          placeholder={selectedProvider.modelPlaceholder}
                          disabled={aiCredentials.isLoading || saveAiCredential.isPending}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={!hasCurrentApiKey || deleteAiCredential.isPending}
                      onClick={() =>
                        deleteAiCredential.mutate(
                          { provider: activeProvider },
                          {
                            onSuccess: () => {
                              setApiKeyDraft("");
                              setBaseUrlDraft("");
                              setModelDraft("");
                            },
                          },
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      删除密钥
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={!canSaveAiCredential}
                      onClick={() =>
                        saveAiCredential.mutate(
                          {
                            provider: activeProvider,
                            apiKey: apiKeyDraft || null,
                            baseUrl: baseUrlDraft || null,
                            model: modelDraft || null,
                          },
                          {
                            onSuccess: () => setApiKeyDraft(""),
                          },
                        )
                      }
                    >
                      <Save className="h-4 w-4" />
                      {saveAiCredential.isPending ? "保存中" : "保存配置"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="backup" className="py-4">
            <div className="space-y-4">
              <SectionHeading
                icon={DatabaseBackup}
                title="备份"
                description="设置数据库备份目录，并可手动生成一份当前数据库副本。"
              />

              <Field label="备份目录" htmlFor="backup-dir">
                <Input
                  id="backup-dir"
                  value={backupDirDraft}
                  onChange={(e) => setBackupDirDraft(e.target.value)}
                  placeholder="例如 D:\\Backups\\Wordforge"
                  disabled={backupSettings.isLoading || updateBackupSettings.isPending}
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!backupDirChanged || updateBackupSettings.isPending}
                  onClick={() =>
                    updateBackupSettings.mutate({
                      backupDir: backupDirDraft || null,
                      autoBackupEnabled,
                    })
                  }
                >
                  保存备份目录
                </Button>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-md border bg-background p-3 text-sm transition-colors hover:bg-accent/40">
                <span>
                  <span className="block font-medium">启用自动备份</span>
                  <span className="text-xs text-muted-foreground">
                    应用启动后若已过本地时间 03:00，当天最多自动备份一次。
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) =>
                    updateBackupSettings.mutate({
                      backupDir: backupDirDraft || null,
                      autoBackupEnabled: e.target.checked,
                    })
                  }
                  disabled={backupSettings.isLoading || updateBackupSettings.isPending}
                  className="peer sr-only"
                />
                <span className="flex h-5 w-9 shrink-0 items-center rounded-full bg-muted p-0.5 transition-colors peer-checked:bg-primary peer-checked:[&>span]:translate-x-4 peer-disabled:opacity-50">
                  <span className="h-4 w-4 rounded-full bg-background shadow-sm transition-transform" />
                </span>
              </label>

              <div className="flex items-center justify-between rounded-md border bg-background p-3">
                <div className="text-sm">
                  <p className="font-medium">立即备份</p>
                  <p className="text-xs text-muted-foreground">
                    生成 `wordforge-时间戳.db` 到备份目录，并保留最近 7 份。
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  disabled={!backupDirDraft.trim() || backupNow.isPending}
                  onClick={() => backupNow.mutate({ backupDir: backupDirDraft || null })}
                >
                  <DatabaseBackup className="h-4 w-4" />
                  {backupNow.isPending ? "备份中" : "立即备份"}
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="export" className="py-4">
            <div className="space-y-4">
              <SectionHeading
                icon={FileDown}
                title="导出当前作品"
                description="可选择导出目录；未选择时使用应用数据目录下的 exports 文件夹。"
              />

              <div className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileArchive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{currentProject?.name ?? "未选作品"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentProject
                    ? "导出会按当前章节树顺序生成文件。"
                    : "请先打开一个作品，再执行导出。"}
                </p>
              </div>

              <div className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">导出位置</p>
                    <p
                      className="mt-1 truncate text-xs text-muted-foreground"
                      title={exportDir || undefined}
                    >
                      {exportDir || "默认：应用数据目录 / wordforge / exports"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {exportDir && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExportDir("")}
                      >
                        使用默认
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={chooseExportDir}>
                      <FolderOpen className="h-4 w-4" />
                      选择目录
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <section className="space-y-2">
                  <p className="text-sm font-medium">格式</p>
                  {EXPORT_FORMAT_OPTIONS.map((option) => (
                    <SettingOptionCard
                      key={option.value}
                      icon={option.value === "markdown" ? FileText : FileArchive}
                      title={option.label}
                      description={option.description}
                      active={exportFormat === option.value}
                      onClick={() => setExportFormat(option.value)}
                    />
                  ))}
                </section>

                <section className="space-y-2">
                  <p className="text-sm font-medium">方式</p>
                  {EXPORT_MODE_OPTIONS.map((option) => (
                    <SettingOptionCard
                      key={option.value}
                      icon={option.value === "merged" ? FileArchive : FolderOpen}
                      title={option.label}
                      description={option.description}
                      active={exportMode === option.value}
                      onClick={() => setExportMode(option.value)}
                    />
                  ))}
                </section>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={!currentProjectId || exportProject.isPending}
                  onClick={() => {
                    if (!currentProjectId) return;
                    exportProject.mutate(
                      {
                        projectId: currentProjectId,
                        format: exportFormat,
                        mode: exportMode,
                        targetDir: exportDir || null,
                      },
                      {
                        onSuccess: setLastExport,
                      },
                    );
                  }}
                >
                  <FileDown className="h-4 w-4" />
                  {exportProject.isPending ? "导出中" : "导出"}
                </Button>
              </div>

              {lastExport && (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">最近导出：{lastExport.fileCount} 个文件</p>
                    <p className="truncate text-xs text-muted-foreground" title={lastExport.path}>
                      {lastExport.path}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => void revealItemInDir(lastExport.path)}
                  >
                    <FolderOpen className="h-4 w-4" />
                    打开位置
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="counting" className="py-4">
            <div className="space-y-4">
              <SectionHeading
                icon={Hash}
                title="字数计数模式"
                description="影响编辑器实时字数、保存到章节的字数和写作会话增量。"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                {WORD_COUNT_OPTIONS.map((option) => (
                  <SettingOptionCard
                    key={option.value}
                    icon={Hash}
                    title={option.label}
                    description={option.description}
                    active={wordCountMode === option.value}
                    onClick={() => setWordCountMode(option.value)}
                  />
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

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SettingOptionCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-2 rounded-md border p-3 text-left text-sm transition-colors",
        active ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:bg-accent/70",
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
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

function fontOptionLabel(value: EditorFontFamily) {
  return FONT_OPTIONS.find((option) => option.value === value)?.label ?? "无衬线";
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
