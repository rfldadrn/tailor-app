"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const storageKey = "ruang-jahit-theme";
const themeChangeEvent = "ruang-jahit-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function getSnapshot(): Theme {
  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    window.localStorage.setItem(storageKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(themeChangeEvent));
  }

  const label = theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang";

  return (
    <button
      aria-label={label}
      aria-pressed={theme === "dark"}
      className="button icon-button"
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      {theme === "light" ? <Moon aria-hidden="true" size={16} /> : <Sun aria-hidden="true" size={16} />}
    </button>
  );
}
