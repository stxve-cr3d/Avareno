import { isRouteErrorResponse, useRouteError, useNavigate } from "react-router-dom";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Branded, calm error fallback wired into the router as `errorElement`.
 * Catches render-time errors and thrown route responses so a single
 * failure shows a trustworthy recovery screen instead of a raw stack.
 */
export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  let status: number | null = null;
  let detail = "Ein unerwarteter Fehler ist aufgetreten.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    detail = error.status === 404
      ? "Diese Seite gibt es nicht oder sie wurde verschoben."
      : error.statusText || detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  const isNotFound = status === 404;

  return (
    <main className="av-route-error" role="alert">
      <div className="av-route-error-card">
        <span className="av-route-error-icon" aria-hidden="true">
          <AlertTriangle size={20} />
        </span>
        <p className="av-route-error-kicker">{isNotFound ? "404 · Nicht gefunden" : "Fehler"}</p>
        <h1>{isNotFound ? "Seite nicht gefunden" : "Etwas ist schiefgelaufen"}</h1>
        <p className="av-route-error-detail">{detail}</p>
        <div className="av-route-error-actions">
          {!isNotFound ? (
            <button type="button" className="av-btn av-btn-primary" onClick={() => window.location.reload()}>
              <RotateCcw size={15} /> Neu laden
            </button>
          ) : null}
          <button type="button" className="av-btn av-btn-secondary" onClick={() => navigate("/app")}>
            <Home size={15} /> Zur Startseite
          </button>
        </div>
        <p className="av-route-error-note">
          Deine Daten sind sicher gespeichert. Falls das Problem bleibt, lade die Seite neu.
        </p>
      </div>
    </main>
  );
}
