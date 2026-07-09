import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { AppLoadingBar } from "../components/app/AppKit";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { api } from "../lib/api";
import { getAuthAccessToken } from "../lib/authClient";
import { useAuth } from "../lib/authProvider";
import { useLanguage } from "../lib/language";
import {
  formatPrice,
  getPlanById,
  getYearlySavings,
  type BillingInterval,
  type PlanId
} from "../lib/pricing";
import type { CheckoutRequest } from "../lib/types";

const paidPlanIds = new Set<PlanId>(["personal", "pro", "family"]);

export function CheckoutPage() {
  const { planId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const normalizedPlanId = normalizePlanId(planId);
  const plan = getPlanById(normalizedPlanId);
  const interval = normalizeInterval(searchParams.get("interval"));
  const locale = language === "de" ? "de-DE" : "en-US";
  const price = plan.prices[interval];
  const savings = getYearlySavings(plan.id);
  const copy = checkoutCopy[language];
  const isAuthenticated = auth.status === "authenticated";
  const checkoutPath = `/checkout/${plan.id}?interval=${interval}`;
  const billingReturnState = searchParams.get("billing");

  useEffect(() => {
    document.title = `${copy.title} | Avareno`;
  }, [copy.title]);

  useEffect(() => {
    if (billingReturnState !== "cancelled" && billingReturnState !== "canceled") {
      return;
    }

    setMessage(copy.cancelled);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("billing");
    setSearchParams(nextParams, { replace: true });
  }, [billingReturnState, copy.cancelled, searchParams, setSearchParams]);

  const limitRows = useMemo(() => [
    [copy.limits.items, formatNumber(plan.limits.items, locale)],
    [copy.limits.storage, formatStorage(plan.limits.documentStorageMb)],
    [copy.limits.reminders, formatNumber(plan.limits.reminders, locale)],
    [copy.limits.ai, formatNumber(plan.limits.aiActionsPerMonth, locale)],
    [copy.limits.vaults, formatNumber(plan.limits.vaults, locale)],
    [copy.limits.members, formatNumber(plan.limits.householdMembers, locale)]
  ], [copy, locale, plan]);

  if (!paidPlanIds.has(plan.id)) {
    return <Navigate to="/pricing" replace />;
  }

  function setInterval(nextInterval: BillingInterval) {
    setSearchParams({ interval: nextInterval }, { replace: true });
  }

  async function continueToStripe() {
    setMessage("");

    if (!isAuthenticated) {
      navigate("/login", { state: { from: checkoutPath } });
      return;
    }

    const token = await getAuthAccessToken();
    if (!token) {
      setMessage(copy.sessionRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api<{ checkoutUrl: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planKey: plan.id, billingInterval: interval } satisfies CheckoutRequest)
      });
      window.location.assign(result.checkoutUrl);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : copy.checkoutError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="avareno-page site-page checkout-review-page">
      <MarketingHeader />
      <main className="checkout-review-main">
        <Link className="checkout-back-link" to="/#pricing">
          <ArrowLeft size={16} />
          {copy.back}
        </Link>

        <section className="checkout-review-grid" aria-labelledby="checkout-title">
          <div className="checkout-review-copy">
            <p className="site-eyebrow">{copy.eyebrow}</p>
            <h1 id="checkout-title">{copy.heading(plan.name)}</h1>
            <p>{copy.body}</p>

            <div className="checkout-trust-list" aria-label={copy.trustAria}>
              <span><ShieldCheck size={16} />{copy.trust.private}</span>
              <span><LockKeyhole size={16} />{copy.trust.stripe}</span>
              <span><CreditCard size={16} />{copy.trust.methods}</span>
            </div>
          </div>

          <aside className="checkout-review-panel" aria-label={copy.summaryAria}>
            <div className="checkout-plan-head">
              <div>
                <span>{copy.selectedPlan}</span>
                <strong>{plan.name}</strong>
              </div>
              {plan.isPopular ? <em>{copy.popular}</em> : null}
            </div>

            <div className="checkout-price-block">
              <strong>{formatPrice(price.amount, price.currency, locale)}</strong>
              <span>{interval === "yearly" ? copy.year : copy.month}</span>
              {interval === "yearly" && savings > 0 ? (
                <small>{copy.savings(formatPrice(savings, plan.currency, locale))}</small>
              ) : null}
            </div>

            <div className="checkout-interval-switch" aria-label={copy.intervalAria}>
              <button className={interval === "monthly" ? "is-active" : ""} onClick={() => setInterval("monthly")} type="button">
                {copy.monthly}
              </button>
              <button className={interval === "yearly" ? "is-active" : ""} onClick={() => setInterval("yearly")} type="button">
                {copy.yearly}
              </button>
            </div>

            <dl className="checkout-limit-list">
              {limitRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <ul className="checkout-feature-list">
              {plan.features.map((feature) => (
                <li key={feature.id}>
                  <Check size={15} />
                  {feature.label[language]}
                </li>
              ))}
            </ul>

            {!isAuthenticated ? (
              <p className="checkout-session-note">{copy.loginNote}</p>
            ) : null}
            {message ? <p className="checkout-message">{message}</p> : null}
            <AppLoadingBar active={isSubmitting} label={copy.loading} />

            <button className="checkout-primary-action" disabled={isSubmitting || auth.status === "loading"} onClick={() => void continueToStripe()} type="button">
              {isAuthenticated ? copy.continue : copy.signIn}
              <ArrowRight size={16} />
            </button>
            <p className="checkout-provider-note">{copy.providerNote}</p>
          </aside>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function normalizePlanId(value: string | undefined): PlanId {
  if (value === "personal" || value === "pro" || value === "family") return value;
  return "free";
}

function normalizeInterval(value: string | null): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatStorage(valueMb: number) {
  if (valueMb >= 1024) {
    const gb = valueMb / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${valueMb} MB`;
}

const checkoutCopy = {
  de: {
    title: "Checkout",
    eyebrow: "Plan bestaetigen",
    heading: (planName: string) => `${planName} fuer dein privates Gedaechtnis`,
    body: "Pruefe Plan, Zeitraum und Kontingente. Zahlungsdaten gibst du erst auf der sicheren Stripe-Seite ein.",
    back: "Zurueck zu Preise",
    selectedPlan: "Ausgewaehlter Plan",
    popular: "Empfohlen",
    month: "/Monat",
    year: "/Jahr",
    monthly: "Monatlich",
    yearly: "Jaehrlich",
    intervalAria: "Abrechnungszeitraum",
    summaryAria: "Checkout Zusammenfassung",
    trustAria: "Checkout Vertrauen",
    continue: "Weiter zu Stripe",
    signIn: "Einloggen und fortfahren",
    loading: "Stripe Checkout wird vorbereitet...",
    loginNote: "Du musst eingeloggt sein, bevor Avareno eine Stripe-Session erstellt.",
    sessionRequired: "Stripe Checkout braucht eine echte Login-Session. Melde dich bitte erneut an.",
    checkoutError: "Checkout ist gerade nicht verfuegbar.",
    cancelled: "Checkout wurde abgebrochen. Dein Plan wurde nicht geaendert.",
    providerNote: "Zahlung, Zahlungsmethoden und Rechnungsdaten werden von Stripe verarbeitet. Avareno speichert hier keine Zahlungsdaten.",
    savings: (value: string) => `Spare ${value} pro Jahr`,
    limits: {
      items: "Objekte",
      storage: "Dokumente",
      reminders: "Erinnerungen",
      ai: "AI-Aktionen / Monat",
      vaults: "Vaults",
      members: "Mitglieder"
    },
    trust: {
      private: "Privates Konto",
      stripe: "Zahlung ueber Stripe",
      methods: "Aktive Zahlungsmethoden"
    }
  },
  en: {
    title: "Checkout",
    eyebrow: "Confirm plan",
    heading: (planName: string) => `${planName} for your private memory`,
    body: "Review your plan, billing period and limits. Payment details are entered only on Stripe's secure page.",
    back: "Back to pricing",
    selectedPlan: "Selected plan",
    popular: "Recommended",
    month: "/month",
    year: "/year",
    monthly: "Monthly",
    yearly: "Yearly",
    intervalAria: "Billing period",
    summaryAria: "Checkout summary",
    trustAria: "Checkout trust",
    continue: "Continue to Stripe",
    signIn: "Sign in to continue",
    loading: "Preparing Stripe Checkout...",
    loginNote: "You need to be signed in before Avareno creates a Stripe session.",
    sessionRequired: "Stripe Checkout needs a real login session. Please sign in again.",
    checkoutError: "Checkout is not available right now.",
    cancelled: "Checkout was cancelled. Your plan was not changed.",
    providerNote: "Payment, payment methods and billing details are handled by Stripe. Avareno does not store payment details here.",
    savings: (value: string) => `Save ${value} per year`,
    limits: {
      items: "Objects",
      storage: "Documents",
      reminders: "Reminders",
      ai: "AI actions / month",
      vaults: "Vaults",
      members: "Members"
    },
    trust: {
      private: "Private account",
      stripe: "Payment via Stripe",
      methods: "Enabled payment methods"
    }
  }
};
