import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "../lib/theme";
import { useTheme } from "../lib/theme";

const themeOptions: Array<{ icon: typeof Monitor; label: string; value: ThemePreference }> = [
  { icon: Monitor, label: "System", value: "system" },
  { icon: Moon, label: "Dunkel", value: "dark" },
  { icon: Sun, label: "Hell", value: "light" }
];

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { setThemePreference, themePreference } = useTheme();

  return (
    <div className={`theme-switch ${className}`.trim()} role="group" aria-label="Darstellung wählen">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        return (
          <button
            aria-pressed={themePreference === option.value}
            className={themePreference === option.value ? "is-active" : ""}
            key={option.value}
            onClick={() => setThemePreference(option.value)}
            type="button"
          >
            <Icon size={15} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
