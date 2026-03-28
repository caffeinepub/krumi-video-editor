import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bold,
  ChevronRight,
  Download,
  Film,
  Layers,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { toast } from "sonner";
import type { AppState, AudioTrack, Clip, TextOverlay } from "../App";

type Action =
  | { type: "TOGGLE_THEME" }
  | { type: "SET_THEME"; payload: "dark" | "light" }
  | { type: "OPEN_EDITOR"; payload: { name: string; aspectRatio: string } }
  | { type: "GO_HOME" }
  | { type: "ADD_CLIP"; payload: Clip }
  | { type: "ADD_AUDIO"; payload: AudioTrack }
  | { type: "SET_TRANSITION"; payload: { key: string; value: string } }
  | { type: "ADD_TEMPLATE"; payload: any }
  | { type: "ADD_TEXT_OVERLAY"; payload: TextOverlay }
  | { type: "REMOVE_TEXT_OVERLAY"; payload: string }
  | { type: "UPDATE_TEXT_OVERLAY"; payload: TextOverlay }
  | {
      type: "UPDATE_CLIP";
      payload: { id: string; trimStart?: number; trimEnd?: number };
    };

const TRANSITIONS = [
  { id: "fade", label: "Fade", icon: "◑" },
  { id: "slide-left", label: "Slide Left", icon: "←" },
  { id: "slide-right", label: "Slide Right", icon: "→" },
  { id: "zoom-in", label: "Zoom In", icon: "⊕" },
  { id: "zoom-out", label: "Zoom Out", icon: "⊖" },
];

const TRANSITION_CLASS_MAP: Record<string, string> = {
  fade: "clip-transition-fade",
  "slide-left": "clip-transition-slide-left",
  "slide-right": "clip-transition-slide-right",
  "zoom-in": "clip-transition-zoom-in",
  "zoom-out": "clip-transition-zoom-out",
};

const SIDEBAR_TABS = [
  { id: "media", label: "Media", icon: Film },
  { id: "audio", label: "Audio", icon: Music },
  { id: "text", label: "Text", icon: Type },
  { id: "transitions", label: "Transitions", icon: Zap },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "filters", label: "Filters", icon: Layers },
];

const TEXT_COLORS = [
  { value: "#ffffff", label: "White" },
  { value: "#facc15", label: "Yellow" },
  { value: "#ef4444", label: "Red" },
  { value: "#22d3ee", label: "Cyan" },
  { value: "#000000", label: "Black" },
  { value: "#f472b6", label: "Pink" },
];

const FONT_SIZES = [16, 24, 32, 48];

const FONT_FAMILIES = [
  { value: "sans-serif", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Mono" },
  { value: "cursive", label: "Cursive" },
  { value: "Impact, fantasy", label: "Impact" },
  { value: "Georgia, serif", label: "Georgia" },
];

function formatTime(secs: number) {
  if (!secs || Number.isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(secs: number) {
  return formatTime(secs);
}

function getAspectStyle(ratio: string) {
  const map: Record<string, { width: string; aspectRatio: string }> = {
    "16:9": { width: "100%", aspectRatio: "16/9" },
    "9:16": { width: "auto", aspectRatio: "9/16" },
    "1:1": { width: "auto", aspectRatio: "1/1" },
    "4:3": { width: "100%", aspectRatio: "4/3" },
  };
  return map[ratio] || map["16:9"];
}

interface Props {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export default function EditorScreen({ state, dispatch }: Props) {
  const [activeTab, setActiveTab] = useState("media");
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState("fade");
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null);
  const [transitionClass, setTransitionClass] = useState("");

  // Text overlay panel state
  const [textInput, setTextInput] = useState("");
  const [textFontSize, setTextFontSize] = useState(24);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBold, setTextBold] = useState(false);
  const [textFontFamily, setTextFontFamily] = useState("sans-serif");

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const videoImportRef = useRef<HTMLInputElement>(null);
  const audioImportRef = useRef<HTMLInputElement>(null);
  const timelineImportRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const draggingRef = useRef<{ id: string } | null>(null);

  const activeClip = state.clips[activeClipIdx] ?? null;
  const aspectStyle = getAspectStyle(state.project?.aspectRatio ?? "16:9");

  // Load clip into video and seek to trimStart
  useEffect(() => {
    if (videoRef.current && activeClip) {
      videoRef.current.src = activeClip.url;
      videoRef.current.load();
      videoRef.current.currentTime = activeClip.trimStart ?? 0;
    }
  }, [activeClip]);

  // Enforce trimEnd during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip) return;

    function handleTimeUpdate() {
      if (!video || !activeClip) return;
      const end = activeClip.trimEnd ?? activeClip.duration;
      if (video.currentTime >= end) {
        video.pause();
        setIsPlaying(false);
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [activeClip]);

  function switchClip(idx: number) {
    // Find transition between previous clip and new clip
    const prevIdx = activeClipIdx;
    const minIdx = Math.min(prevIdx, idx);
    const transKey = `clip-${minIdx}-${minIdx + 1}`;
    const trans = state.transitions[transKey];
    if (trans && TRANSITION_CLASS_MAP[trans]) {
      setTransitionClass(TRANSITION_CLASS_MAP[trans]);
      setTimeout(() => setTransitionClass(""), 500);
    }
    setActiveClipIdx(idx);
  }

  function handleImportVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      const clip: Clip = {
        id: `c${Date.now()}`,
        file,
        url,
        name: file.name.replace(/\.[^.]+$/, ""),
        duration: video.duration,
      };
      dispatch({ type: "ADD_CLIP", payload: clip });
      toast.success(`Imported: ${clip.name}`);
    };
    e.target.value = "";
  }

  function handleImportAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const track: AudioTrack = {
      id: `a${Date.now()}`,
      file,
      url,
      name: file.name.replace(/\.[^.]+$/, ""),
    };
    dispatch({ type: "ADD_AUDIO", payload: track });
    toast.success(`Added audio: ${track.name}`);
    e.target.value = "";
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }

  function toggleAudio(idx: number) {
    if (playingAudioIdx === idx) {
      audioRefs.current[idx]?.pause();
      setPlayingAudioIdx(null);
    } else {
      if (playingAudioIdx !== null) audioRefs.current[playingAudioIdx]?.pause();
      audioRefs.current[idx]?.play();
      setPlayingAudioIdx(idx);
    }
  }

  function setTransitionBetween(clipIdx: number, value: string) {
    const key = `clip-${clipIdx}-${clipIdx + 1}`;
    dispatch({ type: "SET_TRANSITION", payload: { key, value } });
  }

  function getTransitionBetween(clipIdx: number) {
    return state.transitions[`clip-${clipIdx}-${clipIdx + 1}`] ?? "";
  }

  function addTextOverlay() {
    if (!textInput.trim()) {
      toast.error("Enter some text first");
      return;
    }
    const overlay: TextOverlay = {
      id: `t${Date.now()}`,
      text: textInput.trim(),
      x: 50,
      y: 50,
      fontSize: textFontSize,
      color: textColor,
      fontWeight: textBold ? "bold" : "normal",
      fontFamily: textFontFamily,
    };
    dispatch({ type: "ADD_TEXT_OVERLAY", payload: overlay });
    setTextInput("");
    toast.success("Text overlay added");
  }

  function handleOverlayMouseDown(e: React.MouseEvent, overlay: TextOverlay) {
    e.preventDefault();
    draggingRef.current = { id: overlay.id };
    const container = previewRef.current;
    if (!container) return;

    function onMouseMove(me: MouseEvent) {
      if (!draggingRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(100, ((me.clientX - rect.left) / rect.width) * 100),
      );
      const y = Math.max(
        0,
        Math.min(100, ((me.clientY - rect.top) / rect.height) * 100),
      );
      dispatch({
        type: "UPDATE_TEXT_OVERLAY",
        payload: { ...overlay, x, y },
      });
    }

    function onMouseUp() {
      draggingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async function handleExport() {
    if (!videoRef.current || state.clips.length === 0) {
      toast.error("No video to export");
      return;
    }

    setIsExporting(true);
    toast.info("Starting export...");

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.project?.name ?? "krumi-export"}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      toast.success("Export downloaded!");
    };

    recorder.start();
    // Seek to trimStart before recording
    const trimStart = activeClip?.trimStart ?? 0;
    const trimEnd = activeClip?.trimEnd ?? activeClip?.duration ?? 0;
    video.currentTime = trimStart;
    await video.play();

    const overlaysSnapshot = [...state.textOverlays];

    const drawFrame = () => {
      if (video.ended || video.paused) {
        recorder.stop();
        return;
      }
      // Stop at trimEnd
      if (trimEnd > 0 && video.currentTime >= trimEnd) {
        video.pause();
        recorder.stop();
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      for (const overlay of overlaysSnapshot) {
        ctx.save();
        ctx.font = `${overlay.fontWeight} ${overlay.fontSize}px ${overlay.fontFamily ?? "sans-serif"}`;
        ctx.fillStyle = overlay.color;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 3;
        const x = (overlay.x / 100) * canvas.width;
        const y = (overlay.y / 100) * canvas.height;
        ctx.textAlign = "center";
        ctx.fillText(overlay.text, x, y);
        ctx.restore();
      }
      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button
            data-ocid="editor.back.button"
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "GO_HOME" })}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-display font-semibold text-foreground">
            {state.project?.name}
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {state.project?.aspectRatio}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="editor.export.button"
            size="sm"
            disabled={isExporting || state.clips.length === 0}
            onClick={handleExport}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Icon Sidebar */}
        <aside className="flex h-full w-14 flex-shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3">
          {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              data-ocid={`editor.${id}.tab`}
              onClick={() => {
                if (activeTab === id && panelOpen) {
                  setPanelOpen(false);
                } else {
                  setActiveTab(id);
                  setPanelOpen(true);
                }
              }}
              title={label}
              className={cn(
                "flex w-10 flex-col items-center gap-1 rounded-lg p-2 text-[10px] font-medium transition-colors",
                activeTab === id && panelOpen
                  ? "bg-accent/20 text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </aside>

        {/* Side Panel */}
        {panelOpen && (
          <div className="krumi-panel-bg animate-fade-in flex h-full w-52 flex-shrink-0 flex-col border-r border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <span className="text-sm font-semibold capitalize text-foreground">
                {activeTab}
              </span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="scrollbar-hide flex-1 space-y-2 overflow-y-auto p-3">
              {/* Media Panel */}
              {activeTab === "media" && (
                <>
                  <input
                    ref={videoImportRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleImportVideo}
                  />
                  <Button
                    data-ocid="media.upload_button"
                    size="sm"
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => videoImportRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                    Import Video
                  </Button>
                  {state.clips.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No videos imported
                    </p>
                  )}
                  {state.clips.map((clip, idx) => (
                    <button
                      type="button"
                      key={clip.id}
                      data-ocid={`media.item.${idx + 1}`}
                      onClick={() => switchClip(idx)}
                      className={cn(
                        "w-full rounded-lg border p-2 text-left transition-colors",
                        activeClipIdx === idx
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-card hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                          <Film className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">
                            {clip.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDuration(clip.duration)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Audio Panel */}
              {activeTab === "audio" && (
                <>
                  <input
                    ref={audioImportRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleImportAudio}
                  />
                  <Button
                    data-ocid="audio.upload_button"
                    size="sm"
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => audioImportRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                    Import Audio
                  </Button>
                  {state.audioTracks.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No audio tracks
                    </p>
                  )}
                  {state.audioTracks.map((track, idx) => (
                    <div
                      key={track.id}
                      data-ocid={`audio.item.${idx + 1}`}
                      className="rounded-lg border border-border bg-card p-2"
                    >
                      {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded audio, no captions available */}
                      <audio
                        ref={(el) => {
                          if (el) audioRefs.current[idx] = el;
                        }}
                        src={track.url}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAudio(idx)}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30"
                        >
                          {playingAudioIdx === idx ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </button>
                        <p className="truncate text-xs text-foreground">
                          {track.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Text Panel */}
              {activeTab === "text" && (
                <>
                  <Input
                    data-ocid="text.input"
                    placeholder="Enter text overlay..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTextOverlay()}
                    className="text-sm"
                  />

                  {/* Font Size */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Size
                    </p>
                    <div className="flex gap-1">
                      {FONT_SIZES.map((size) => (
                        <button
                          type="button"
                          key={size}
                          onClick={() => setTextFontSize(size)}
                          className={cn(
                            "flex-1 rounded py-1 text-[10px] font-medium transition-colors",
                            textFontSize === size
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Font
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {FONT_FAMILIES.map((f) => (
                        <button
                          type="button"
                          key={f.value}
                          onClick={() => setTextFontFamily(f.value)}
                          className={cn(
                            "rounded py-1 text-[10px] font-medium transition-colors",
                            textFontFamily === f.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                          )}
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Color
                    </p>
                    <div className="flex gap-1.5">
                      {TEXT_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c.value}
                          title={c.label}
                          onClick={() => setTextColor(c.value)}
                          className={cn(
                            "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                            textColor === c.value
                              ? "border-primary scale-110"
                              : "border-transparent",
                            c.value === "#000000" && "ring-1 ring-border",
                          )}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Bold Toggle */}
                  <button
                    type="button"
                    data-ocid="text.toggle"
                    onClick={() => setTextBold(!textBold)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      textBold
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Bold className="h-3.5 w-3.5" />
                    Bold
                  </button>

                  <Button
                    data-ocid="text.submit_button"
                    size="sm"
                    className="w-full"
                    onClick={addTextOverlay}
                  >
                    Add Text
                  </Button>

                  {/* Existing overlays list */}
                  {state.textOverlays.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Overlays ({state.textOverlays.length})
                      </p>
                      {state.textOverlays.map((overlay, idx) => (
                        <div
                          key={overlay.id}
                          data-ocid={`text.item.${idx + 1}`}
                          className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
                        >
                          <span
                            className="block h-3 w-3 flex-shrink-0 rounded-full"
                            style={{
                              backgroundColor: overlay.color,
                              border: "1px solid #555",
                            }}
                          />
                          <p className="flex-1 truncate text-xs text-foreground">
                            {overlay.text}
                          </p>
                          <button
                            type="button"
                            data-ocid={`text.delete_button.${idx + 1}`}
                            onClick={() =>
                              dispatch({
                                type: "REMOVE_TEXT_OVERLAY",
                                payload: overlay.id,
                              })
                            }
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Transitions Panel */}
              {activeTab === "transitions" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Select default transition
                  </p>
                  {TRANSITIONS.map((t, tIdx) => (
                    <button
                      type="button"
                      key={t.id}
                      data-ocid={`transitions.item.${tIdx + 1}`}
                      onClick={() => setSelectedTransition(t.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors",
                        selectedTransition === t.id
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/30",
                      )}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <span className="font-medium">{t.label}</span>
                      {selectedTransition === t.id && (
                        <span className="ml-auto text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Effects Panel */}
              {activeTab === "effects" && (
                <div className="py-6 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Effects coming soon
                  </p>
                </div>
              )}

              {/* Filters Panel */}
              {activeTab === "filters" && (
                <div className="py-6 text-center">
                  <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Filters coming soon
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center Preview */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden bg-background p-4">
          {/* Video Preview */}
          <div
            ref={previewRef}
            className="relative overflow-hidden rounded-xl bg-black shadow-2xl"
            style={{
              aspectRatio: aspectStyle.aspectRatio,
              maxHeight: "calc(100vh - 300px)",
              maxWidth: "100%",
              width: state.project?.aspectRatio === "9:16" ? "auto" : "100%",
            }}
          >
            {activeClip ? (
              // biome-ignore lint/a11y/useMediaCaption: user-uploaded video, no captions available
              <video
                ref={videoRef}
                className={cn("h-full w-full object-contain", transitionClass)}
                src={activeClip.url}
                muted={isMuted}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div
                data-ocid="editor.canvas_target"
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3"
                onClick={() => videoImportRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === "Enter" && videoImportRef.current?.click()
                }
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground/60 transition-colors hover:border-primary/60 hover:text-primary">
                  <Plus className="h-8 w-8" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to import video
                </p>
              </div>
            )}

            {/* Text Overlays */}
            {state.textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                style={{
                  position: "absolute",
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: overlay.fontSize,
                  color: overlay.color,
                  fontWeight: overlay.fontWeight,
                  fontFamily: overlay.fontFamily ?? "sans-serif",
                  cursor: "move",
                  userSelect: "none",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                  whiteSpace: "nowrap",
                }}
                onMouseDown={(e) => handleOverlayMouseDown(e, overlay)}
              >
                {overlay.text}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              data-ocid="editor.toggle"
              onClick={() => setIsMuted(!isMuted)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              data-ocid="editor.primary_button"
              onClick={togglePlay}
              disabled={!activeClip}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                activeClip
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" />
              )}
            </button>

            <div className="text-xs text-muted-foreground">
              {activeClip ? formatDuration(activeClip.duration) : "0:00"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div
        className="krumi-timeline-bg flex flex-shrink-0 flex-col border-t border-border"
        style={{ minHeight: "8rem" }}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Timeline
          </span>
          <span className="text-xs text-muted-foreground">
            {state.clips.length} clip{state.clips.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="timeline-scroll flex-1 overflow-x-auto">
          <div
            className="flex h-full items-center gap-0 px-4 py-2"
            style={{ minWidth: "max-content" }}
          >
            {state.clips.length === 0 && (
              <div
                data-ocid="timeline.empty_state"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <p className="text-xs">Import videos to start editing</p>
              </div>
            )}

            {state.clips.map((clip, idx) => (
              <div key={clip.id} className="flex items-center">
                {/* Clip Card */}
                <button
                  type="button"
                  data-ocid={`timeline.item.${idx + 1}`}
                  onClick={() => switchClip(idx)}
                  className={cn(
                    "relative flex h-20 w-28 flex-shrink-0 flex-col overflow-hidden rounded-lg border-2 transition-colors",
                    activeClipIdx === idx
                      ? "border-primary"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex flex-1 items-center justify-center bg-muted">
                    <Film className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <div className="bg-card/80 px-1.5 py-1 backdrop-blur-sm">
                    <p className="truncate text-[10px] font-medium text-foreground">
                      {clip.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {clip.trimStart !== undefined ||
                      clip.trimEnd !== undefined
                        ? `${formatTime(clip.trimStart ?? 0)} – ${formatTime(clip.trimEnd ?? clip.duration)}`
                        : formatDuration(clip.duration)}
                    </p>
                  </div>
                  {activeClipIdx === idx && (
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-primary" />
                  )}
                </button>

                {/* Transition Button between clips */}
                {idx < state.clips.length - 1 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="mx-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                        title="Add transition"
                      >
                        {getTransitionBetween(idx) ? "◑" : "+"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      data-ocid="timeline.popover"
                      className="w-44 p-2"
                      side="top"
                    >
                      <p className="mb-2 text-xs font-semibold text-foreground">
                        Transition
                      </p>
                      {TRANSITIONS.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => setTransitionBetween(idx, t.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                            getTransitionBetween(idx) === t.id
                              ? "bg-primary/20 text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          <span>{t.icon}</span> {t.label}
                          {getTransitionBetween(idx) === t.id && (
                            <span className="ml-auto">✓</span>
                          )}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ))}

            {/* Add More Videos Button */}
            <div className="ml-2">
              <input
                ref={timelineImportRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleImportVideo}
              />
              <button
                type="button"
                data-ocid="timeline.upload_button"
                onClick={() => timelineImportRef.current?.click()}
                className="flex h-20 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px]">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Trim Controls for active clip */}
        {activeClip && (
          <div
            data-ocid="timeline.panel"
            className="border-t border-border/50 px-4 py-2"
          >
            <div className="flex items-center gap-3">
              <Scissors className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground w-20 flex-shrink-0">
                Trim: <span className="text-foreground">{activeClip.name}</span>
              </span>
              <div className="flex flex-1 items-center gap-3">
                {/* In point */}
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-4">
                    In
                  </span>
                  <input
                    data-ocid="timeline.input"
                    type="range"
                    min={0}
                    max={activeClip.duration}
                    step={0.1}
                    value={activeClip.trimStart ?? 0}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      const end = activeClip.trimEnd ?? activeClip.duration;
                      if (val < end) {
                        dispatch({
                          type: "UPDATE_CLIP",
                          payload: { id: activeClip.id, trimStart: val },
                        });
                        if (videoRef.current)
                          videoRef.current.currentTime = val;
                      }
                    }}
                    className="flex-1 accent-primary h-1"
                  />
                  <span className="text-[10px] text-primary w-8">
                    {formatTime(activeClip.trimStart ?? 0)}
                  </span>
                </div>
                {/* Out point */}
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-6">
                    Out
                  </span>
                  <input
                    data-ocid="timeline.input"
                    type="range"
                    min={0}
                    max={activeClip.duration}
                    step={0.1}
                    value={activeClip.trimEnd ?? activeClip.duration}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      const start = activeClip.trimStart ?? 0;
                      if (val > start) {
                        dispatch({
                          type: "UPDATE_CLIP",
                          payload: { id: activeClip.id, trimEnd: val },
                        });
                        if (videoRef.current)
                          videoRef.current.currentTime = val;
                      }
                    }}
                    className="flex-1 accent-primary h-1"
                  />
                  <span className="text-[10px] text-primary w-8">
                    {formatTime(activeClip.trimEnd ?? activeClip.duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
