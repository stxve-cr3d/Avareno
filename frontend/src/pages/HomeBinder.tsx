import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, ChevronRight, FileCheck2, Home, Package, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { HomeBinderReport } from "../lib/types";
import { ProgressBar } from "../components/ProgressBar";

export function HomeBinder() {
  const [report, setReport] = useState<HomeBinderReport | null>(null);

  useEffect(() => {
    api<HomeBinderReport>("/api/reports/home-binder").then(setReport).catch(console.error);
  }, []);

  const missingItems = useMemo(
    () => report?.items.filter((item) => !item.binderStatus.insuranceReady) ?? [],
    [report]
  );
  const focusItem = missingItems[0] ?? report?.items[0];

  if (!report) return <div className="documents-loading">Dokumente werden geladen...</div>;

  return (
    <main className="documents-page">
      <section className="documents-hero">
        <div>
          <span>Hausakte</span>
          <h1>Dokumente</h1>
          <p>Belege, Garantien und wichtige Nachweise bleiben bei den Dingen, zu denen sie gehören.</p>
        </div>
      </section>

      <section className="documents-focus">
        <div>
          <span>Heute sinnvoll</span>
          <h2>{report.summary.readiness}% vollständig</h2>
          <p>
            {missingItems.length > 0
              ? `${missingItems.length} Dinge brauchen noch einen Beleg, eine Garantie oder einen Standort.`
              : "Alle wichtigen Dinge haben aktuell genug Kontext fuer Garantie, Versicherung und Support."}
          </p>
          <ProgressBar value={report.summary.readiness} />
        </div>
        <Link className="documents-primary-action" to={focusItem ? `/app/items/${focusItem.id}` : "/app/items"}>
          Fehlende Punkte prüfen
          <ChevronRight size={16} />
        </Link>
      </section>

      <section className="documents-stats" aria-label="Dokumente Überblick">
        <DocumentStat icon={<Archive size={18} />} label="Dinge" value={String(report.summary.itemCount)} />
        <DocumentStat icon={<ShieldCheck size={18} />} label="Geschützt" value={String(report.summary.protectedCount)} />
        <DocumentStat icon={<FileCheck2 size={18} />} label="Offen" value={String(report.summary.missingDataPoints)} />
      </section>

      <section className="documents-grid">
        <article className="documents-panel documents-main-list">
          <div className="documents-panel-head">
            <div>
              <span>Produktakten</span>
              <h2>Wichtige Dinge</h2>
            </div>
            <Link to="/app/items">Alle anzeigen</Link>
          </div>
          <div className="documents-item-list">
            {report.items.slice(0, 6).map((item) => (
              <Link className="documents-item-row" key={item.id} to={`/app/items/${item.id}`}>
                <span className="documents-row-icon">
                  <Package size={17} />
                </span>
                <span className="documents-row-copy">
                  <strong>{displayItemName(item.name)}</strong>
                  <small>
                    {item.space?.name ?? item.location ?? "Kein Raum"} / {displayDate(item.warrantyUntil)}
                  </small>
                </span>
                <span className={item.binderStatus.insuranceReady ? "documents-pill is-ready" : "documents-pill"}>
                  {item.binderStatus.insuranceReady ? "Bereit" : "Fehlt"}
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </article>

        <article className="documents-panel documents-space-panel">
          <div className="documents-panel-head">
            <div>
              <span>Räume</span>
              <h2>Wo es liegt</h2>
            </div>
            <Home size={18} />
          </div>
          <div className="documents-space-list">
            {report.spaces.slice(0, 5).map((space) => (
              <div className="documents-space-row" key={space.name}>
                <div>
                  <strong>{space.name}</strong>
                  <small>{space.itemCount} Dinge</small>
                </div>
                <span>{Math.round(space.value)} EUR</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function DocumentStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="documents-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function displayDate(value?: string | null) {
  const formatted = isoDate(value);
  return formatted === "No date" ? "Kein Datum" : formatted;
}

function displayItemName(name: string) {
  if (name.toLowerCase().includes("3d printer")) return "Smartes Gerät";
  if (name.toLowerCase().includes("test passport")) return "Produktpass";
  return name;
}
