import { Sparkles } from "lucide-react";

export function XpPill({ xp, level }: { xp: number; level: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-black text-ink shadow-soft ring-1 ring-line/80">
      <Sparkles className="text-leaf" size={16} />
      <span>{xp} XP</span>
      <span className="text-muted">Level {level}</span>
    </div>
  );
}
