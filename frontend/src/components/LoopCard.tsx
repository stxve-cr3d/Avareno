import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, MessageCircle, PackageCheck, ReceiptText } from "lucide-react";
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
    <div className="care-row">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-ink text-white">
        <SourceIcon size={19} />
      </div>
      <Link to={`/app/care/${loop.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-base font-black text-ink">{loop.title}</p>
          <Badge tone={priorityTone[loop.priority]}>{loop.priority === "MEDIUM" ? "easy" : loop.priority.toLowerCase()}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-muted">{loop.description ?? loop.sourceType}</p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-wash px-3 py-1.5 text-xs font-black text-muted">
          <Clock3 size={14} />
          {isoDate(loop.dueDate)}
        </span>
      </Link>
      {onComplete ? (
        <button className="shrink-0 rounded-md bg-leaf px-3 py-3 text-xs font-black text-white transition hover:bg-moss" onClick={() => onComplete(loop.id)}>
          <span className="hidden sm:inline">Close +{loop.xpReward}</span>
          <CheckCircle2 className="sm:hidden" size={16} />
        </button>
      ) : null}
    </div>
  );
}
