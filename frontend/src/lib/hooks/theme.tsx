import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { clearLegacyUiDomOverrides } from "@/lib/ui/preferences/dom";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme";
const UI_PREFERENCES_STORAGE_KEY = "jobbingtrack-ui-preferences-v1";
const LEGACY_CUSTOMIZATION_KEY = "customization-settings";

function themeToCustomizationTheme(theme: Theme): "light" | "dark" | "auto" {
  return theme === "system" ? "auto" : theme;
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return (stored as Theme) || "dark";
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  const customizationTheme = themeToCustomizationTheme(theme);

  // Le moteur UI persiste aussi le thème. Le garder synchronisé évite qu'il
  // réapplique `auto` au refresh et écrase le bouton clair/sombre.
  try {
    const rawPrefs = localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs);
      localStorage.setItem(
        UI_PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          ...prefs,
          theme,
          customization: {
            ...(prefs.customization || {}),
            theme: customizationTheme,
          },
        }),
      );
    }
  } catch {
    // Ignore les préférences corrompues : le provider les régénère au chargement.
  }

  try {
    const rawLegacy = localStorage.getItem(LEGACY_CUSTOMIZATION_KEY);
    const legacy = rawLegacy ? JSON.parse(rawLegacy) : {};
    localStorage.setItem(
      LEGACY_CUSTOMIZATION_KEY,
      JSON.stringify({ ...legacy, theme: customizationTheme }),
    );
  } catch {
    localStorage.setItem(
      LEGACY_CUSTOMIZATION_KEY,
      JSON.stringify({ theme: customizationTheme }),
    );
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const body = document.body;

  // Supprimer les classes existantes
  root.classList.remove("light", "dark");
  body.classList.remove("light", "dark");

  let actualTheme: "light" | "dark";

  if (theme === "system") {
    actualTheme = getSystemTheme();
  } else {
    actualTheme = theme;
  }

  // Appliquer le thème (light/dark + classe Tailwind `dark`)
  root.classList.add(actualTheme);
  body.classList.add(actualTheme);
  if (actualTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Mettre à jour le meta tag theme-color pour mobile
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      actualTheme === "dark" ? "#111827" : "#ffffff",
    );
  }
}

export const ThemeContext = createContext<{
  theme: Theme;
  actualTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  toggleTheme: () => void;
  setThemeMode: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");

  // Charger le thème initial
  useEffect(() => {
    const storedTheme = getStoredTheme();
    setStoredTheme(storedTheme);
    setTheme(storedTheme);
    setSystemTheme(getSystemTheme());

    // Écouter les changements du système
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    clearLegacyUiDomOverrides();
  }, []);

  // Appliquer le thème quand il change
  useEffect(() => {
    const actualTheme = theme === "system" ? systemTheme : theme;
    applyTheme(theme);

    // Mettre à jour le meta tag theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        actualTheme === "dark" ? "#111827" : "#ffffff",
      );
    }
  }, [theme, systemTheme]);

  // Calculer le thème actuel
  const actualTheme = theme === "system" ? systemTheme : theme;

  const toggleTheme = () => {
    const newTheme = actualTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  const contextValue = {
    theme,
    actualTheme,
    systemTheme,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
