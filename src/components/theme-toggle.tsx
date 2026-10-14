import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearWallpaper, loadWallpaper, prepareWallpaper, saveWallpaper } from "@/lib/wallpaper";

const THEME_KEY = "v2mp3-theme";

type ThemeId = "light" | "dark" | "ocean" | "aurora" | "berry" | "galaxy";
const THEMES: { id: ThemeId; label: string; dark: boolean; swatch: string }[] = [
  { id: "light", label: "Sunrise", dark: false, swatch: "linear-gradient(135deg,#ff6a5b,#ffb347)" },
  { id: "ocean", label: "Ocean", dark: false, swatch: "linear-gradient(135deg,#1fa2ff,#12d8c4)" },
  { id: "berry", label: "Berry", dark: false, swatch: "linear-gradient(135deg,#e5408a,#a259ff)" },
  { id: "dark", label: "Midnight", dark: true, swatch: "linear-gradient(135deg,#2b2b30,#ff7a5c)" },
  { id: "aurora", label: "Aurora", dark: true, swatch: "linear-gradient(135deg,#0f3b3a,#34e3a0)" },
  { id: "galaxy", label: "Galaxy", dark: true, swatch: "linear-gradient(135deg,#1b1347,#b06bff)" },
];
const CLASSES = THEMES.map((t) => `theme-${t.id}`);

function applyTheme(id: ThemeId) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0]!;
  const root = document.documentElement;
  root.classList.remove(...CLASSES);
  root.classList.add(`theme-${t.id}`);
  root.classList.toggle("dark", t.dark);
}

let wallpaperUrl: string | null = null;
function applyWallpaper(blob: Blob | null) {
  if (wallpaperUrl) {
    URL.revokeObjectURL(wallpaperUrl);
    wallpaperUrl = null;
  }
  if (blob) {
    wallpaperUrl = URL.createObjectURL(blob);
    document.documentElement.style.setProperty("--app-wallpaper", `url("${wallpaperUrl}")`);
  } else {
    document.documentElement.style.removeProperty("--app-wallpaper");
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("light");
  const [open, setOpen] = useState(false);
  const [hasWallpaper, setHasWallpaper] = useState(false);
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [wallpaperError, setWallpaperError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage can be unavailable */ }
      const next = (THEMES.some((t) => t.id === saved) ? saved : system.matches ? "dark" : "light") as ThemeId;
      applyTheme(next);
      setTheme(next);
    };
    sync();
    system.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadWallpaper()
      .then((blob) => {
        if (!alive || !blob) return;
        applyWallpaper(blob);
        setHasWallpaper(true);
      })
      .catch(() => { /* wallpaper is optional */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
    setOpen(false);
    try { localStorage.setItem(THEME_KEY, id); } catch { /* keep the session choice */ }
  };

  const pickWallpaper = async (file: File | undefined) => {
    if (!file) return;
    setWallpaperBusy(true);
    setWallpaperError(false);
    try {
      const blob = await prepareWallpaper(file);
      await saveWallpaper(blob);
      applyWallpaper(blob);
      setHasWallpaper(true);
      setOpen(false);
    } catch {
      setWallpaperError(true);
    } finally {
      setWallpaperBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeWallpaper = async () => {
    setWallpaperBusy(true);
    try { await clearWallpaper(); } catch { /* still clear visually */ }
    applyWallpaper(null);
    setHasWallpaper(false);
    setWallpaperBusy(false);
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full bg-card text-foreground shadow-card"
        aria-label="Choose theme"
        aria-expanded={open}
        title="Choose theme"
        onClick={() => setOpen((o) => !o)}
      >
        <Palette />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-card">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="menuitemradio"
              aria-checked={theme === t.id}
              onClick={() => choose(t.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold hover:bg-secondary"
            >
              <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={{ background: t.swatch }} />
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}

          <div className="mx-1 my-1.5 border-t border-border" />
          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Wallpaper</p>
          <button
            role="menuitem"
            onClick={() => fileRef.current?.click()}
            disabled={wallpaperBusy}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 text-left">{wallpaperBusy ? "Saving…" : "Upload photo"}</span>
          </button>
          {hasWallpaper && (
            <button
              role="menuitem"
              onClick={removeWallpaper}
              disabled={wallpaperBusy}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
              <span className="flex-1 text-left">Remove wallpaper</span>
            </button>
          )}
          {wallpaperError && (
            <p className="px-2 pb-1 text-xs text-destructive">That image could not be used. Try another photo.</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickWallpaper(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
}
