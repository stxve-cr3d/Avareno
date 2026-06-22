import { useEffect, useState } from "react";
import { Archive, FileCheck2, Home, Package, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { HomeBinderReport } from "../lib/types";
import { ProgressBar } from "../components/ProgressBar";

export function HomeBinder() {
  const [report, setReport] = useState<HomeBinderReport | null>(null);

  useEffect(() => {
    api<HomeBinderReport>("/api/reports/home-binder").then(setReport).catch(console.error);
  }, []);

  if (!report) return <div className="py-12 text-center text-sm font-semibold text-muted">Loading home binder...</div>;

  return (
    <div className="binder-page mx-auto max-w-7xl space-y-5">
      <section className="binder-hero rounded-lg">
        <div>
          <p className="text-xs font-black uppercase text-leaf">{report.wow.label}</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(3rem,7vw,7rem)] font-black leading-[0.9] text-white">
            deine hausakte in einem griff
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/62">{report.wow.promise}</p>
        </div>
        <div className="binder-readiness">
          <p className="text-xs font-black uppercase text-white/50">Readiness</p>
          <strong>{report.summary.readiness}%</strong>
          <ProgressBar value={report.summary.readiness} />
        </div>
      </section>

      <section className="binder-stats">
        <BinderStat icon={<Archive />} label="Items" value={String(report.summary.itemCount)} />
        <BinderStat icon={<WalletCards />} label="Value" value={`${report.summary.totalValue} EUR`} />
        <BinderStat icon={<ShieldCheck />} label="Protected" value={String(report.summary.protectedCount)} />
        <BinderStat icon={<FileCheck2 />} label="Missing points" value={String(report.summary.missingDataPoints)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="binder-panel rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted">Spaces</p>
              <h2 className="mt-1 text-3xl font-black text-ink">Where value lives</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
              <Home size={18} />
            </span>
          </div>
          <div className="mt-5 grid gap-2">
            {report.spaces.map((space) => (
              <div className="binder-space-row" key={space.name}>
                <div>
                  <p>{space.name}</p>
                  <span>{space.itemCount} things</span>
                </div>
                <strong>{Math.round(space.value)} EUR</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="binder-panel rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted">Insurance view</p>
              <h2 className="mt-1 text-3xl font-black text-ink">Ready and missing</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-leaf/10 text-leaf">
              <Sparkles size={18} />
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {report.items.map((item) => (
              <Link className="binder-item-row" key={item.id} to={`/items/${item.id}`}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-wash text-leaf">
                  <Package size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-black text-ink">{item.name}</span>
                  <span className="text-sm font-semibold text-muted">
                    {item.space?.name ?? item.location ?? "No room"} / {isoDate(item.warrantyUntil)}
                  </span>
                </span>
                <span className={`binder-pill ${item.binderStatus.insuranceReady ? "binder-pill-good" : ""}`}>
                  {item.binderStatus.insuranceReady ? "ready" : "missing"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BinderStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="binder-stat">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
