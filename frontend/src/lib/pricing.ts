export type PlanId = "free" | "personal" | "pro" | "family";
export type BillingInterval = "monthly" | "yearly";
export type BillingPeriod = BillingInterval;
export type AppLocale = "de" | "en";
export type CurrencyCode = "EUR";

export type PlanFeature =
  | "warrantyTracking"
  | "receiptTracking"
  | "basicExports"
  | "customFields"
  | "fullExports"
  | "advancedAiAssistance"
  | "sharedSpaces"
  | "familyReminders";

export type PlanLimitKey = keyof PlanLimits;

export type LocalizedText = Record<AppLocale, string>;

export type PlanFeatureItem = {
  id: PlanFeature;
  label: LocalizedText;
};

export type PlanLimits = {
  items: number;
  documentStorageMb: number;
  reminders: number;
  aiActionsPerMonth: number;
  vaults: number;
  users: number;
  householdMembers: number;
};

export type PlanPrice = {
  amount: number;
  currency: CurrencyCode;
  interval: BillingInterval;
  stripeLookupKey?: string;
  stripePriceEnvName?: string;
  taxBehavior: "inclusive";
};

export type PricingPlan = {
  id: PlanId;
  name: string;
  description: LocalizedText;
  currency: CurrencyCode;
  prices: Record<BillingInterval, PlanPrice>;
  limits: PlanLimits;
  features: PlanFeatureItem[];
  isPopular: boolean;
  isStripeSubscription: boolean;
  ctaLabel: LocalizedText;
  ctaHref: string;
};

export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    description: {
      de: "Fuer die ersten Objekte und zum Ausprobieren.",
      en: "For the first things and trying Avareno."
    },
    currency: "EUR",
    prices: {
      monthly: price("monthly", 0),
      yearly: price("yearly", 0)
    },
    limits: {
      items: 30,
      documentStorageMb: 100,
      reminders: 5,
      aiActionsPerMonth: 10,
      vaults: 1,
      users: 1,
      householdMembers: 1
    },
    features: [
      feature("warrantyTracking", "Garantie-Tracking", "Warranty tracking"),
      feature("receiptTracking", "Beleg-Tracking", "Receipt tracking")
    ],
    isPopular: false,
    isStripeSubscription: false,
    ctaLabel: { de: "Kostenlos starten", en: "Start free" },
    ctaHref: "/signup"
  },
  {
    id: "personal",
    name: "Personal",
    description: {
      de: "Fuer deinen privaten Speicher im Alltag.",
      en: "For your private everyday memory."
    },
    currency: "EUR",
    prices: {
      monthly: price("monthly", 4.99, "avareno_personal_monthly", "STRIPE_PRICE_PERSONAL_MONTHLY"),
      yearly: price("yearly", 49, "avareno_personal_yearly", "STRIPE_PRICE_PERSONAL_YEARLY")
    },
    limits: {
      items: 300,
      documentStorageMb: 2048,
      reminders: 100,
      aiActionsPerMonth: 100,
      vaults: 1,
      users: 1,
      householdMembers: 1
    },
    features: [
      feature("warrantyTracking", "Garantie-Tracking", "Warranty tracking"),
      feature("receiptTracking", "Beleg-Tracking", "Receipt tracking"),
      feature("basicExports", "Basis-Exporte", "Basic exports")
    ],
    isPopular: false,
    isStripeSubscription: true,
    ctaLabel: { de: "Personal waehlen", en: "Choose Personal" },
    ctaHref: "/signup?plan=personal"
  },
  {
    id: "pro",
    name: "Pro",
    description: {
      de: "Fuer groessere Objektgedaechtnisse und mehr AI-Unterstuetzung.",
      en: "For larger object memories and more AI assistance."
    },
    currency: "EUR",
    prices: {
      monthly: price("monthly", 8.99, "avareno_pro_monthly", "STRIPE_PRICE_PRO_MONTHLY"),
      yearly: price("yearly", 89, "avareno_pro_yearly", "STRIPE_PRICE_PRO_YEARLY")
    },
    limits: {
      items: 2000,
      documentStorageMb: 20480,
      reminders: 1000,
      aiActionsPerMonth: 500,
      vaults: 3,
      users: 1,
      householdMembers: 1
    },
    features: [
      feature("warrantyTracking", "Garantie-Tracking", "Warranty tracking"),
      feature("receiptTracking", "Beleg-Tracking", "Receipt tracking"),
      feature("customFields", "Eigene Felder", "Custom fields"),
      feature("fullExports", "Vollstaendige Exporte", "Full exports"),
      feature("advancedAiAssistance", "Erweiterte AI-Unterstuetzung", "Advanced AI assistance")
    ],
    isPopular: true,
    isStripeSubscription: true,
    ctaLabel: { de: "Pro waehlen", en: "Choose Pro" },
    ctaHref: "/signup?plan=pro"
  },
  {
    id: "family",
    name: "Family",
    description: {
      de: "Fuer Haushalte, Familie und gemeinsame Verantwortung.",
      en: "For households, families and shared responsibility."
    },
    currency: "EUR",
    prices: {
      monthly: price("monthly", 12.99, "avareno_family_monthly", "STRIPE_PRICE_FAMILY_MONTHLY"),
      yearly: price("yearly", 129, "avareno_family_yearly", "STRIPE_PRICE_FAMILY_YEARLY")
    },
    limits: {
      items: 5000,
      documentStorageMb: 51200,
      reminders: 2500,
      aiActionsPerMonth: 1000,
      vaults: 5,
      users: 5,
      householdMembers: 5
    },
    features: [
      feature("warrantyTracking", "Garantie-Tracking", "Warranty tracking"),
      feature("receiptTracking", "Beleg-Tracking", "Receipt tracking"),
      feature("sharedSpaces", "Geteilte Bereiche", "Shared spaces"),
      feature("familyReminders", "Familien-Erinnerungen", "Family reminders"),
      feature("customFields", "Eigene Felder", "Custom fields"),
      feature("fullExports", "Vollstaendige Exporte", "Full exports")
    ],
    isPopular: false,
    isStripeSubscription: true,
    ctaLabel: { de: "Family waehlen", en: "Choose Family" },
    ctaHref: "/signup?plan=family"
  }
] satisfies PricingPlan[];

export const subscriptionPlans = pricingPlans;

export function getPlanById(planId: PlanId | string | null | undefined): PricingPlan {
  return pricingPlans.find((plan) => plan.id === planId) ?? pricingPlans[0];
}

export function getPaidPlans(): PricingPlan[] {
  return pricingPlans.filter((plan) => plan.isStripeSubscription);
}

export function getStripeLookupKey(planId: PlanId | string | null | undefined, interval: BillingInterval): string | null {
  return getPlanById(planId).prices[interval]?.stripeLookupKey ?? null;
}

export function getStripePriceId(_: PlanId | string | null | undefined, __: BillingInterval): string | null {
  return null;
}

export function getStripePriceEnvName(planId: PlanId | string | null | undefined, interval: BillingInterval): string | null {
  return getPlanById(planId).prices[interval]?.stripePriceEnvName ?? null;
}

export function getPlanByStripePriceId(_: string | null | undefined): { plan: PricingPlan; billingInterval: BillingInterval } | null {
  return null;
}

export function getPlanLimits(planId: PlanId | string | null | undefined): PlanLimits {
  return getPlanById(planId).limits;
}

export function canUseFeature(planId: PlanId | string | null | undefined, featureId: PlanFeature): boolean {
  return getPlanById(planId).features.some((featureItem) => featureItem.id === featureId);
}

export function isWithinPlanLimit(
  planId: PlanId | string | null | undefined,
  limitKey: PlanLimitKey,
  currentValue: number,
  requestedAmount = 0
): boolean {
  const limit = getPlanLimits(planId)[limitKey];
  return currentValue + requestedAmount <= limit;
}

export function formatPrice(amount: number, currency: CurrencyCode = "EUR", locale = "de-DE"): string {
  const hasMinorUnits = !Number.isInteger(amount);

  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: hasMinorUnits ? 2 : 0,
    minimumFractionDigits: hasMinorUnits ? 2 : 0,
    style: "currency"
  }).format(amount);
}

export function getPlanPrice(planOrId: PricingPlan | PlanId | string, interval: BillingInterval): PlanPrice {
  const plan = typeof planOrId === "string" ? getPlanById(planOrId) : planOrId;
  return plan.prices[interval];
}

export function getYearlySavings(planId: PlanId | string | null | undefined): number {
  const plan = getPlanById(planId);
  return Math.max(0, Number((plan.prices.monthly.amount * 12 - plan.prices.yearly.amount).toFixed(2)));
}

export function publicPricingPlans(): PricingPlan[] {
  return [...pricingPlans];
}

function price(interval: BillingInterval, amount: number, stripeLookupKey?: string, stripePriceEnvName?: string): PlanPrice {
  return { amount, currency: "EUR", interval, stripeLookupKey, stripePriceEnvName, taxBehavior: "inclusive" };
}

function feature(id: PlanFeature, de: string, en: string): PlanFeatureItem {
  return { id, label: { de, en } };
}
