import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "v2mp3-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage can be unavailable */ }
      const next = saved === "dark" || (saved !== "light" && system.matches);
      document.documentElement.classList.toggle("dark", next);
      setDark(next);
    };
    apply();
    system.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      system.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-10 w-10 shrink-0 rounded-full bg-card text-foreground shadow-card"
      aria-label={label}
      aria-pressed={dark}
      title={label}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* keep the session choice */ }
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}