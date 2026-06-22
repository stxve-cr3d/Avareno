import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  Clock3,
  FilePlus2,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap
} from "lucide-react";
import { api, isoDate } from "../lib/api";
import type { Dashboard, Item, Planner, Reminder } from "../lib/types";
import { ItemCard } from "../components/ItemCard";
import { LoopCard } from "../components/LoopCard";

export function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [success, setSuccess] = useState("");

  async function load() {
    const [dashboardResult, plannerResult] = await Promise.all([api<Dashboard>("/api/dashboard"), api<Planner>("/api/planner")]);
    setDashboard(dashboardResult);
    setPlanner(plannerResult);
  }

  useEffect(() => {
    void load();
  }, []);

  async function completeLoop(id: string) {
    const result = await api<{ message: string }>(`/api/loops/${id}/complete`, { method: "POST" });
    setSuccess(result.message);
    await load();
  }

  if (!dashboard) return <div className="py-12 text-center text-sm font-semibold text-muted">Loading Mavora...</div>;

  const heroItem = dashboard.incompleteItems[0];
  const nextLoop = planner?.nextBest ?? dashboard.openLoops[0] ?? null;
  const topLoops = (planner?.today.length ? planner.today : dashboard.openLoops).slice(0, 3);
  const priorityNotifications = planner?.notifications.slice(0, 3) ?? [];

  return (
    <div className="ozma-home mx-auto max-w-7xl">
      <section className="ozma-hero overflow-hidden rounded-lg px-5 py-7 md:px-8 md:py-8">
        <div className="ozma-hero-layout">
          <div className="relative z-10">
            <p className="ozma-hero-kicker text-sm font-black uppercase tracking-normal">hello, i am mavora</p>
            <h1 className="mt-5 max-w-4xl text-[clamp(3rem,7.6vw,7rem)] font-black leading-[0.9] text-ink">
              a home for the things you live with
            </h1>
            <p className="ozma-hero-subcopy mt-6 max-w-xl text-base font-semibold leading-7 md:text-lg">
              Receipts, rooms, warranty dates, serial numbers, and care tasks in one calm visual library.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="ozma-primary-action" to="/capture/receipt">
                Start with receipt <ArrowRight size={17} />
              </Link>
              <Link className="ozma-secondary-action" to="/items">
                View things
              </Link>
            </div>

            <div className="ozma-hero-stats mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <HeroNumber icon={<Package size={17} />} value={dashboard.stats.incompleteItemCount} label="Things" />
              <HeroNumber icon={<CalendarCheck2 size={17} />} value={dashboard.stats.remindersSoonCount} label="Soon" />
              <HeroNumber icon={<ShieldCheck size={17} />} value={dashboard.stats.openLoopCount} label="Care" />
            </div>
          </div>

          <HeroObject item={heroItem} />
        </div>
      </section>

      <section className="mavora-ops">
        <div className="mavora-ops-focus">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-leaf">today's plan</p>
              <h2 className="mt-2 max-w-2xl text-[clamp(2.35rem,5vw,5.75rem)] font-black leading-[0.92] text-white">
                {nextLoop ? nextLoop.title : "Nothing needs you right now"}
              </h2>
            </div>
            <span className="mavora-live-pill">
              <Zap size={15} />
              live plan
            </span>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <PlanCount label="overdue" value={planner?.counts.overdue ?? 0} />
            <PlanCount label="today" value={planner?.counts.today ?? dashboard.stats.openLoopCount} />
            <PlanCount label="upcoming" value={planner?.counts.upcoming ?? dashboard.stats.remindersSoonCount} />
            <PlanCount label="open" value={planner?.counts.totalOpen ?? dashboard.stats.openLoopCount} />
          </div>

          {nextLoop ? (
            <div className="mavora-next-action">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-white/50">
                  <Clock3 size={15} />
                  {isoDate(nextLoop.dueDate ?? nextLoop.reminderAt)}
                </p>
                <p className="mt-2 text-lg font-black text-white">{nextLoop.item?.name ?? "General care"}</p>
                <p className="mt-1 text-sm font-semibold text-white/60">{nextLoop.description ?? "Planned from your saved object memory."}</p>
              </div>
              <button className="mavora-white-action" type="button" onClick={() => completeLoop(nextLoop.id)}>
                Close +{nextLoop.xpReward} XP <ArrowRight size={16} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="mavora-ops-side">
          <div className="mavora-notification-head">
            <div>
              <p className="text-xs font-black uppercase text-muted">notifications</p>
              <h3 className="mt-1 text-3xl font-black text-ink">{planner?.notificationCounts.dueNow ?? 0} due now</h3>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white">
              <BellRing size={20} />
            </span>
          </div>

          <div className="mt-5 grid gap-2">
            {priorityNotifications.length ? (
              priorityNotifications.map((notification) => <NotificationLine key={notification.id} notification={notification} />)
            ) : (
              <div className="mavora-notification-line">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf/10 text-leaf">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <p className="font-black text-ink">All quiet</p>
                  <p className="text-sm font-semibold text-muted">No active reminders in the next window.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mavora-mobile-sync">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink">
              <Smartphone size={18} />
            </span>
            <div>
              <p className="text-sm font-black text-white">Mobile sync layer is ready</p>
              <p className="text-xs font-semibold text-white/60">Bootstrap, device tokens, planner, and notifications.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ozma-section">
        <div className="ozma-section-heading">
          <p>what it keeps</p>
          <h2>The physical details that normally disappear.</h2>
        </div>
        <div className="ozma-service-grid">
          <ServiceBlock icon={<ReceiptText />} title="Proof" text="Receipts, files, and purchase context stay attached to the item." />
          <ServiceBlock icon={<MapPin />} title="Place" text="Know where the thing lives: room, shelf, office, storage." />
          <ServiceBlock icon={<ShieldCheck />} title="Care" text="Warranty, repair, return, and service reminders without mental clutter." />
          <ServiceBlock icon={<PackageCheck />} title="Identity" text="Brand, model, serial number, price, and the story of ownership." />
        </div>
      </section>

      <section className="ozma-showcase-grid">
        <div className="ozma-panel">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-muted">latest object</p>
              <h2 className="mt-2 text-4xl font-black text-ink">Object scene</h2>
            </div>
            <Link className="ozma-text-link" to="/items">
              All things <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-6">
            {heroItem ? <ItemCard item={heroItem} /> : <EmptyObject />}
          </div>
        </div>

        <div className="ozma-panel">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase text-muted">today</p>
              <h2 className="mt-2 text-4xl font-black text-ink">Care list</h2>
            </div>
            {success ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-3 py-2 text-xs font-black text-moss">
                <Sparkles size={15} />
                Saved
              </span>
            ) : null}
          </div>
          <div className="mt-6 grid gap-3">
            {topLoops.length ? topLoops.map((loop) => <LoopCard key={loop.id} loop={loop} onComplete={completeLoop} />) : <EmptyObject />}
          </div>
        </div>
      </section>

      <section className="ozma-journal">
        <ActionTile to="/capture/receipt" icon={<ReceiptText />} label="Receipt" title="Turn proof into memory" />
        <ActionTile to="/capture/item" icon={<FilePlus2 />} label="Thing" title="Create a real object profile" />
        <ActionTile to="/capture/message" icon={<MessageCircle />} label="Message" title="Make context actionable" />
      </section>
    </div>
  );
}

function HeroObject({ item }: { item?: Item }) {
  return (
    <div className="ozma-hero-object">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-muted">
          <MapPin size={14} />
          {item?.location ?? "home"}
        </span>
        <span className="text-xs font-black uppercase text-muted">{item ? `${item.completenessScore}% saved` : "ready"}</span>
      </div>

      <div className="ozma-hero-object-media">
        {item?.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <Package size={54} />}
      </div>

      <div className="mt-5">
        <p className="text-xs font-black uppercase text-muted">featured object</p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-ink">{item?.name ?? "Your first object"}</h2>
        <p className="mt-2 text-sm font-semibold text-muted">
          {item ? [item.manufacturer, item.model].filter(Boolean).join(" / ") || item.category : "Start with a receipt or photo."}
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-wash p-3">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-muted">
          <ReceiptText size={14} />
          {item ? isoDate(item.purchaseDate) : "proof"}
        </span>
        <p className="mt-2 text-sm font-black text-ink">{item ? "Receipt and warranty details attached" : "Add proof to remember it later"}</p>
      </div>
    </div>
  );
}

function HeroNumber({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-white/72 p-4 text-left backdrop-blur">
      <div className="mb-3 text-leaf">{icon}</div>
      <p className="text-4xl font-black text-ink">{value}</p>
      <p className="text-xs font-black uppercase text-muted">{label}</p>
    </div>
  );
}

function PlanCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="mavora-plan-count">
      <p>{value}</p>
      <span>{label}</span>
    </div>
  );
}

function NotificationLine({ notification }: { notification: Reminder }) {
  const target = notification.deepLink ?? (notification.item ? `/items/${notification.item.id}` : "/");

  return (
    <Link className="mavora-notification-line" to={target}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf/10 text-leaf">
        {notification.kind === "warranty" ? <ShieldCheck size={18} /> : <BellRing size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-ink">{notification.title}</p>
        <p className="truncate text-sm font-semibold text-muted">{notification.item?.name ?? notification.message}</p>
      </div>
      <span className="text-xs font-black uppercase text-muted">{notification.state?.replace("_", " ") ?? "soon"}</span>
    </Link>
  );
}

function ServiceBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="ozma-service-block">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ActionTile({ to, icon, label, title }: { to: string; icon: ReactNode; label: string; title: string }) {
  return (
    <Link className="ozma-journal-card" to={to}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">{icon}</span>
      <p className="mt-8 text-xs font-black uppercase text-muted">{label}</p>
      <h3 className="mt-2 text-2xl font-black leading-tight text-ink">{title}</h3>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-black text-ink">
        Start <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function EmptyObject() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/70 p-6">
      <p className="text-xl font-black text-ink">Nothing here yet.</p>
      <p className="mt-2 text-sm font-semibold text-muted">Capture something and it will show up here.</p>
    </div>
  );
}
