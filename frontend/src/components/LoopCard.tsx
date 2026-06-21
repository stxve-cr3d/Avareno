import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, MessageCircle, PackageCheck, ReceiptText, Sparkles } from "lucide-react";
import { Badge } from "./Badge";
import type { Loop } from "../lib/types";
import { isoDate } from "../lib/api";

const priorityTone = {
  LOW: "gray",
  MEDIUM: "green",
  HIGH: "amber",
  BOSS: "red"
} as const;

export function LoopCard({ loop, onComplete }: { loop: Loop; onComplete?: (id: string) => void }) {
  const SourceIcon = loop.sourceType === "MESSAGE" ? MessageCircle : loop.sourceType === "RECEIPT" ? ReceiptText : PackageCheck;

  return (
    <div className="group rounded-lg border border-line bg-paper p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-leaf hover:shadow-lift">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-mist text-moss">
          <SourceIcon size={20} />
        </div>
        <Link to={`/loops/${loop.id}`} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-black leading-snug text-ink">{loop.title}</p>
            <Badge tone={priorityTone[loop.priority]}>{loop.priority === "MEDIUM" ? "leicht" : loop.priority.toLowerCase()}</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink/55">{loop.description ?? loop.sourceType}</p>
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3">
        <div className="flex items-center gap-2 text-xs font-black text-ink/45">
          <Clock3 size={15} />
          <span>{isoDate(loop.dueDate)}</span>
        </div>
        {onComplete ? (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-leaf px-3 py-2 text-xs font-black text-white shadow-lift transition hover:bg-moss"
            onClick={() => onComplete(loop.id)}
          >
            <CheckCircle2 size={15} />
            Erledigt +{loop.xpReward} XP
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-black text-leaf">
            <Sparkles size={14} />+{loop.xpReward} XP
          </span>
        )}
      </div>
    </div>
  );
}
