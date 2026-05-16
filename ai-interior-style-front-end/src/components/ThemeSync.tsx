"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/**
 * Syncs the persisted theme from Zustand store to the <html> element class.
 * Must be rendered inside the layout to apply theme on page load.
 */
export default function ThemeSync() {
  const { theme } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme]);

  return null;
}
