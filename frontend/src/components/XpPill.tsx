import { Sparkles } from "lucide-react";

export function XpPill({ xp, level }: { xp: number; level: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-ink ring-1 ring-line">
      <Sparkles size={16} />
      <span>{xp} XP</span>
      <span className="text-ink/40">Level {level}</span>
    </div>
  );
}
