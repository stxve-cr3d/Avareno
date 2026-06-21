import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  FilePlus2,
  Heart,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Trophy
} from "lucide-react";
import { api } from "../lib/api";
import type { Dashboard } from "../lib/types";
import { XpPill } from "../components/XpPill";
import { LoopCard } from "../components/LoopCard";
import { ItemCard } from "../components/ItemCard";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/Badge";

export function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [success, setSuccess] = useState("");

  async function load() {
    setDashboard(await api<Dashboard>("/api/dashboard"));
  }

  useEffect(() => {
    void load();
  }, []);

  async function completeLoop(id: string) {
    const result = await api<{ message: string }>(`/api/loops/${id}/complete`, { method: "POST" });
    setSuccess(result.message);
    await load();
  }

  if (!dashboard) return <div className="py-12 text-center text-sm font-semibold text-ink/55">Loading second memory...</div>;

  const topLoops = dashboard.openLoops.slice(0, 3);
  const nextLoop = topLoops[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-white/70 bg-paper p-5 shadow-soft md:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-leaf via-sky to-coral" />
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-moss">
                <Sparkles size={15} />
                Today Open
              </div>
              <h1 className="max-w-2xl text-4xl font-black leading-[1.04] tracking-normal text-ink md:text-5xl">
                Hi {dashboard.user.name}. Heute ist schon sortierter.
              </h1>
              <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-ink/58">
                {dashboard.stats.openLoopCount} Dinge sind sicher geparkt. Such dir nur den naechsten leichten Schritt aus.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MemoryStat value={dashboard.stats.openLoopCount} label="geparkt" icon={<Heart size={16} />} tone="text-coral bg-orange-50" />
              <MemoryStat value={dashboard.stats.remindersSoonCount} label="sanft bald" icon={<CalendarCheck2 size={16} />} tone="text-sky bg-sky-50" />
              <MemoryStat value={dashboard.stats.incompleteItemCount} label="fast fertig" icon={<Trophy size={16} />} tone="text-leaf bg-emerald-50" />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-mist p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-ink/40">Memory level</p>
                <p className="mt-1 text-2xl font-black text-ink">Level {dashboard.user.level}</p>
              </div>
              <XpPill xp={dashboard.user.xp} level={dashboard.user.level} />
            </div>
            <div className="mt-5 rounded-lg bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-coal text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-black text-ink">Alles ist geparkt.</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-ink/55">
                    Keine Panik-Liste. Nur kleine Erinnerungen, bevor sie wichtig werden.
                  </p>
                </div>
              </div>
            </div>
            {nextLoop ? (
              <Link
                to={`/loops/${nextLoop.id}`}
                className="mt-3 flex items-center justify-between rounded-lg bg-coal px-4 py-3 text-sm font-black text-white transition hover:bg-ink"
              >
                <span>Naechster leichter Schritt</span>
                <ArrowRight size={17} />
              </Link>
            ) : null}
          </div>
        </div>
        {success ? (
          <div className="soft-pop mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-black text-moss ring-1 ring-emerald-200">
            <Sparkles size={16} />
            Good catch {success.replace("Loop closed", "")}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickAction to="/capture/receipt" icon={<PackageCheck />} title="Beleg merken" helper="Foto rein. Geraetekarte raus." tone="text-leaf bg-emerald-50" />
        <QuickAction to="/capture/message" icon={<MessageCircle />} title="Nachricht sichern" helper="Aus Zusage wird Erinnerung." tone="text-sky bg-sky-50" />
        <QuickAction to="/capture/loop" icon={<FilePlus2 />} title="Loop parken" helper="Kurz raus aus dem Kopf." tone="text-coral bg-orange-50" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-ink">Loops</h2>
            <p className="text-sm font-semibold text-ink/48">Ruhig, klein, machbar.</p>
          </div>
          <Link className="flex items-center gap-1 text-sm font-bold text-moss" to="/capture/loop">
            Add <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid gap-3">
          {topLoops.length ? topLoops.map((loop) => <LoopCard key={loop.id} loop={loop} onComplete={completeLoop} />) : <EmptyState title="Alles frei gerade" />}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-ink">Memory cards</h2>
            <p className="text-sm font-semibold text-ink/48">Besitz, Belege und Garantie an einem Ort.</p>
          </div>
          <Badge tone="green">{dashboard.warrantyReminders.length} active</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {dashboard.incompleteItems.slice(0, 2).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MemoryStat({ value, label, icon, tone }: { value: number; label: string; icon: ReactNode; tone: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className={`mb-3 grid h-8 w-8 place-items-center rounded-lg ${tone}`}>{icon}</div>
      <p className="text-2xl font-black text-ink">{value}</p>
      <p className="text-xs font-black text-ink/45">{label}</p>
    </div>
  );
}

function QuickAction({ to, icon, title, helper, tone }: { to: string; icon: ReactNode; title: string; helper: string; tone: string }) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-line bg-paper p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-leaf hover:shadow-lift"
    >
      <div className={`grid h-11 w-11 place-items-center rounded-lg ${tone}`}>{icon}</div>
      <p className="mt-4 text-lg font-black text-ink">{title}</p>
      <p className="mt-1 text-sm font-semibold text-ink/55">{helper}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-black text-moss opacity-0 transition group-hover:opacity-100">
        Starten <ArrowRight size={14} />
      </div>
    </Link>
  );
}
