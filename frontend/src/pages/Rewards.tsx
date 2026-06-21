import { useEffect, useState } from "react";
import { Award, LockKeyhole } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { XpPill } from "../components/XpPill";
import type { User } from "../lib/types";

type RewardsPayload = {
  user: User;
  completedLoopsThisWeek: number;
  completionRate: number;
  badges: { name: string; earned: boolean }[];
  transactions: { id: string; action: string; points: number; createdAt: string }[];
};

export function Rewards() {
  const [rewards, setRewards] = useState<RewardsPayload | null>(null);

  useEffect(() => {
    api<RewardsPayload>("/api/rewards").then(setRewards).catch(console.error);
  }, []);

  if (!rewards) return <div className="py-12 text-center text-sm font-semibold text-ink/55">Loading rewards...</div>;

  return (
    <div className="space-y-5">
      <Card className="!bg-coal text-white">
        <p className="text-sm font-bold text-white/55">Progress</p>
        <h1 className="mt-1 text-3xl font-black">Your loop-closing streak starts here.</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <XpPill xp={rewards.user.xp} level={rewards.user.level} />
          <div className="rounded-lg bg-white/8 px-3 py-2 text-sm font-bold">{rewards.completedLoopsThisWeek} closed this week</div>
          <div className="rounded-lg bg-white/8 px-3 py-2 text-sm font-bold">{rewards.completionRate}% completion</div>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-black text-ink">Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.badges.map((badge) => (
            <div key={badge.name} className={`rounded-lg border p-4 shadow-soft ${badge.earned ? "border-green-200 bg-green-50" : "border-line bg-white"}`}>
              <div className="flex items-center gap-3">
                {badge.earned ? <Award className="text-leaf" /> : <LockKeyhole className="text-ink/35" />}
                <p className="font-black text-ink">{badge.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-black text-ink">XP log</h2>
        <div className="grid gap-2">
          {rewards.transactions.slice(0, 8).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between rounded-lg border border-line bg-white p-3 text-sm">
              <span className="font-bold text-ink">{transaction.action.replace(/_/g, " ")}</span>
              <span className="font-black text-leaf">+{transaction.points}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
