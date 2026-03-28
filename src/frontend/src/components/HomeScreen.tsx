import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Clock,
  Film,
  Home,
  LayoutTemplate,
  Moon,
  Plus,
  Settings,
  Sun,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import type { Dispatch } from "react";
import type { AppState, Template } from "../App";

type Action =
  | { type: "TOGGLE_THEME" }
  | { type: "SET_THEME"; payload: "dark" | "light" }
  | { type: "OPEN_EDITOR"; payload: { name: string; aspectRatio: string } }
  | { type: "GO_HOME" }
  | { type: "ADD_CLIP"; payload: any }
  | { type: "ADD_AUDIO"; payload: any }
  | { type: "SET_TRANSITION"; payload: { key: string; value: string } }
  | { type: "ADD_TEMPLATE"; payload: Template };

const ASPECT_RATIOS = [
  { value: "16:9", label: "Landscape", icon: "▬", desc: "16:9" },
  { value: "9:16", label: "Portrait", icon: "▯", desc: "9:16" },
  { value: "1:1", label: "Square", icon: "■", desc: "1:1" },
  { value: "4:3", label: "Standard", icon: "▭", desc: "4:3" },
];

const CATEGORIES = ["All", "Stories", "Educational", "Inspirational", "News"];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "recent", label: "Recent", icon: Clock },
];

interface Props {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export default function HomeScreen({ state, dispatch }: Props) {
  const [activeNav, setActiveNav] = useState("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("My Project");
  const [selectedRatio, setSelectedRatio] = useState("16:9");
  const uploadRef = useRef<HTMLInputElement>(null);

  const filteredTemplates =
    activeCategory === "All"
      ? state.templates
      : state.templates.filter((t) => t.category === activeCategory);

  function handleCreate() {
    if (!projectName.trim()) return;
    dispatch({
      type: "OPEN_EDITOR",
      payload: { name: projectName, aspectRatio: selectedRatio },
    });
    setCreateOpen(false);
  }

  function handleUploadTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const colors = [
      "from-violet-500 to-fuchsia-600",
      "from-cyan-500 to-blue-600",
      "from-emerald-500 to-green-600",
    ];
    const newTemplate: Template = {
      id: `t${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, ""),
      creator: "You",
      category: "Stories",
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    dispatch({ type: "ADD_TEMPLATE", payload: newTemplate });
    e.target.value = "";
  }

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar */}
      <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Krumi
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              data-ocid={`nav.${id}.link`}
              onClick={() => setActiveNav(id)}
              className={cn(
                "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeNav === id
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {activeNav === id && <ChevronRight className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </nav>

        {/* Bottom: Settings + Theme */}
        <div className="space-y-1 border-t border-border p-3">
          <button
            type="button"
            data-ocid="settings.toggle"
            onClick={() => dispatch({ type: "TOGGLE_THEME" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
            <div className="ml-auto">
              {state.theme === "dark" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
            </div>
          </button>
          <button
            type="button"
            data-ocid="theme.toggle"
            onClick={() => dispatch({ type: "TOGGLE_THEME" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {state.theme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Video Editor
            </h1>
            <p className="text-sm text-muted-foreground">
              Create stunning videos in minutes
            </p>
          </div>
          <Button
            data-ocid="create_project.primary_button"
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create New Project
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Templates Section */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Templates
            </h2>
            <div className="flex items-center gap-2">
              <input
                ref={uploadRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUploadTemplate}
              />
              <Button
                data-ocid="upload_template.button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => uploadRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Template
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-5 flex flex-wrap gap-2" data-ocid="templates.tab">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            data-ocid="templates.list"
          >
            {filteredTemplates.map((template, idx) => (
              <div
                key={template.id}
                data-ocid={`templates.item.${idx + 1}`}
                className="animate-fade-in group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div
                  className={cn(
                    "relative h-28 w-full bg-gradient-to-br",
                    template.color,
                  )}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      className="border-0 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                    >
                      Use Template
                    </Button>
                  </div>
                  <div className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
                    {template.category}
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {template.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {template.creator}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div
              data-ocid="templates.empty_state"
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <LayoutTemplate className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No templates in this category
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-md"
          data-ocid="create_project.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Project Name
              </p>
              <Input
                id="project-name"
                data-ocid="create_project.input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Awesome Video"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                Aspect Ratio
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setSelectedRatio(r.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors",
                      selectedRatio === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    <span className="text-2xl leading-none">{r.icon}</span>
                    <span className="text-xs font-semibold">{r.desc}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              data-ocid="create_project.submit_button"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreate}
            >
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
