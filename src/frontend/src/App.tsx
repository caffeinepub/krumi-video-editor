import { Toaster } from "@/components/ui/sonner";
import { useEffect, useReducer } from "react";
import EditorScreen from "./components/EditorScreen";
import HomeScreen from "./components/HomeScreen";

export type Clip = {
  id: string;
  file: File;
  url: string;
  name: string;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
};

export type AudioTrack = {
  id: string;
  file: File;
  url: string;
  name: string;
};

export type Template = {
  id: string;
  title: string;
  creator: string;
  category: string;
  color: string;
};

export type TextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  fontFamily?: string;
};

export type AppState = {
  theme: "dark" | "light";
  view: "home" | "editor";
  project: { name: string; aspectRatio: string } | null;
  clips: Clip[];
  audioTracks: AudioTrack[];
  transitions: Record<string, string>;
  templates: Template[];
  textOverlays: TextOverlay[];
};

type Action =
  | { type: "TOGGLE_THEME" }
  | { type: "SET_THEME"; payload: "dark" | "light" }
  | { type: "OPEN_EDITOR"; payload: { name: string; aspectRatio: string } }
  | { type: "GO_HOME" }
  | { type: "ADD_CLIP"; payload: Clip }
  | { type: "ADD_AUDIO"; payload: AudioTrack }
  | { type: "SET_TRANSITION"; payload: { key: string; value: string } }
  | { type: "ADD_TEMPLATE"; payload: Template }
  | { type: "ADD_TEXT_OVERLAY"; payload: TextOverlay }
  | { type: "REMOVE_TEXT_OVERLAY"; payload: string }
  | { type: "UPDATE_TEXT_OVERLAY"; payload: TextOverlay }
  | {
      type: "UPDATE_CLIP";
      payload: { id: string; trimStart?: number; trimEnd?: number };
    };

const INITIAL_TEMPLATES: Template[] = [
  {
    id: "t1",
    title: "Travel Vlog Intro",
    creator: "Alex M.",
    category: "Stories",
    color: "from-purple-500 to-blue-600",
  },
  {
    id: "t2",
    title: "Tutorial Opener",
    creator: "Sam K.",
    category: "Educational",
    color: "from-green-500 to-teal-600",
  },
  {
    id: "t3",
    title: "Motivational Reel",
    creator: "Jordan P.",
    category: "Inspirational",
    color: "from-orange-500 to-red-600",
  },
  {
    id: "t4",
    title: "News Broadcast",
    creator: "Taylor R.",
    category: "News",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "t5",
    title: "Story Template",
    creator: "Casey L.",
    category: "Stories",
    color: "from-pink-500 to-rose-600",
  },
  {
    id: "t6",
    title: "Product Showcase",
    creator: "Morgan W.",
    category: "Educational",
    color: "from-yellow-500 to-amber-600",
  },
];

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "TOGGLE_THEME": {
      const next = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("krumi-theme", next);
      return { ...state, theme: next };
    }
    case "SET_THEME":
      return { ...state, theme: action.payload };
    case "OPEN_EDITOR":
      return {
        ...state,
        view: "editor",
        project: action.payload,
        clips: [],
        audioTracks: [],
        transitions: {},
        textOverlays: [],
      };
    case "GO_HOME":
      return { ...state, view: "home" };
    case "ADD_CLIP":
      return { ...state, clips: [...state.clips, action.payload] };
    case "ADD_AUDIO":
      return { ...state, audioTracks: [...state.audioTracks, action.payload] };
    case "SET_TRANSITION":
      return {
        ...state,
        transitions: {
          ...state.transitions,
          [action.payload.key]: action.payload.value,
        },
      };
    case "ADD_TEMPLATE":
      return { ...state, templates: [...state.templates, action.payload] };
    case "ADD_TEXT_OVERLAY":
      return {
        ...state,
        textOverlays: [...state.textOverlays, action.payload],
      };
    case "REMOVE_TEXT_OVERLAY":
      return {
        ...state,
        textOverlays: state.textOverlays.filter((o) => o.id !== action.payload),
      };
    case "UPDATE_TEXT_OVERLAY":
      return {
        ...state,
        textOverlays: state.textOverlays.map((o) =>
          o.id === action.payload.id ? action.payload : o,
        ),
      };
    case "UPDATE_CLIP":
      return {
        ...state,
        clips: state.clips.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload } : c,
        ),
      };
    default:
      return state;
  }
}

export default function App() {
  const savedTheme =
    (localStorage.getItem("krumi-theme") as "dark" | "light") || "dark";
  const [state, dispatch] = useReducer(reducer, {
    theme: savedTheme,
    view: "home",
    project: null,
    clips: [],
    audioTracks: [],
    transitions: {},
    templates: INITIAL_TEMPLATES,
    textOverlays: [],
  });

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [state.theme]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <Toaster />
      {state.view === "home" ? (
        <HomeScreen state={state} dispatch={dispatch} />
      ) : (
        <EditorScreen state={state} dispatch={dispatch} />
      )}
    </div>
  );
}
