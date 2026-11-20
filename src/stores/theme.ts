import { defineStore } from "pinia";
import { ref } from "vue";
import type { Theme } from "@/utils/speedScale";

const STORAGE_KEY = "uoct-theme";

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export const useThemeStore = defineStore("theme", () => {
  // The control room is the primary scene, so dark is the default.
  const theme = ref<Theme>(readStored() ?? "dark");

  function apply(value: Theme) {
    theme.value = value;
    document.documentElement.setAttribute("data-theme", value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage may be blocked; the theme still applies for this session.
    }
  }

  function toggle() {
    apply(theme.value === "dark" ? "light" : "dark");
  }

  apply(theme.value);

  return { theme, apply, toggle };
});
