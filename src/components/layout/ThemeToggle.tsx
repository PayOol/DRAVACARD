"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { readThemePreference, useTheme } from "@/lib/theme-context";

export default function ThemeToggle() {
  const { language } = useLanguage();
  const { preference, setPreference } = useTheme();
  const fr = language === "fr";
  const labels = fr
    ? { system: "Système", light: "Clair", dark: "Sombre" }
    : { system: "System", light: "Light", dark: "Dark" };
  const Icon =
    preference === "system" ? Monitor : preference === "dark" ? Moon : Sun;
  return (
    <label
      className="theme-toggle"
      title={`${fr ? "Thème" : "Theme"} : ${labels[preference]}`}
    >
      <Icon size={18} aria-hidden="true" />
      <select
        aria-label={fr ? "Thème" : "Theme"}
        value={preference}
        onChange={(event) =>
          setPreference(readThemePreference(event.target.value))
        }
      >
        <option value="system">{labels.system}</option>
        <option value="light">{labels.light}</option>
        <option value="dark">{labels.dark}</option>
      </select>
    </label>
  );
}
