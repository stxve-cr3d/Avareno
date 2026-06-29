import { Languages } from "lucide-react";
import { useLanguage } from "../lib/language";

export function LanguageSwitch({ className = "", onSwitch }: { className?: string; onSwitch?: () => void }) {
  const { language, nextLanguageLabel, toggleLanguage } = useLanguage();

  function switchLanguage() {
    toggleLanguage();
    onSwitch?.();
  }

  return (
    <button
      className={`language-switch ${className}`.trim()}
      type="button"
      aria-label={language === "de" ? "Sprache auf Englisch wechseln" : "Switch language to German"}
      onClick={switchLanguage}
    >
      <Languages size={15} aria-hidden="true" />
      <span>{language === "de" ? "DE" : "EN"}</span>
      <span aria-hidden="true">/</span>
      <strong>{nextLanguageLabel}</strong>
    </button>
  );
}
