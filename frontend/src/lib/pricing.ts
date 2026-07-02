export type BillingPeriod = "monthly" | "yearly";
export type PlanId = "free" | "personal" | "pro" | "family";
export type AppLocale = "de" | "en";

export type PlanFeatureId =
  | "object-memory"
  | "documents"
  | "manual-reminders"
  | "warranty-tracking"
  | "ai-extraction"
  | "private-vault"
  | "shared-spaces"
  | "custom-fields"
  | "exports"
  | "priority-care";

export type PlanLimitKey =
  | "items"
  | "documents"
  | "storageMb"
  | "reminders"
  | "warrantyTracking"
  | "aiUsage"
  | "vaultSpaces"
  | "sharedSpaces"
  | "customFields"
  | "exports";

export type PlanLimitValue = number | null;

export type LocalizedText = Record<AppLocale, string>;

export type PlanFeature = {
  id: PlanFeatureId;
  label: LocalizedText;
};

export type PlanLimits = Record<PlanLimitKey, PlanLimitValue>;

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  description: LocalizedText;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: "EUR";
  features: PlanFeature[];
  limits: PlanLimits;
  isPopular: boolean;
  isAvailable: boolean;
  ctaLabel: LocalizedText;
  ctaHref: string;
  unavailableLabel?: LocalizedText;
  yearlyNote?: LocalizedText;
};

export const subscriptionPlans = [
  {
    id: "free",
    name: "Free",
    description: {
      de: "Für die ersten Dinge und zum Ausprobieren.",
      en: "For the first things and trying Avareno."
    },
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "EUR",
    features: [
      feature("object-memory", "Bis zu 10 Dinge", "Up to 10 things"),
      feature("documents", "Begrenzte Belege und Dokumente", "Limited receipts and documents"),
      feature("manual-reminders", "Manuelle Erinnerungen", "Manual reminders"),
      feature("warranty-tracking", "Basis-Garantieübersicht", "Basic warranty overview")
    ],
    limits: {
      items: 10,
      documents: 20,
      storageMb: 100,
      reminders: 5,
      warrantyTracking: 5,
      aiUsage: 5,
      vaultSpaces: 0,
      sharedSpaces: 0,
      customFields: 0,
      exports: 1
    },
    isPopular: false,
    isAvailable: true,
    ctaLabel: { de: "Kostenlos starten", en: "Start free" },
    ctaHref: "/signup"
  },
  {
    id: "personal",
    name: "Personal",
    description: {
      de: "Für deinen privaten Speicher im Alltag.",
      en: "For your private everyday memory."
    },
    monthlyPrice: 9,
    yearlyPrice: 90,
    currency: "EUR",
    features: [
      feature("object-memory", "Großzügige Dinge mit Fair Use", "Generous things with fair use"),
      feature("documents", "Belege, Garantien und Handbücher", "Receipts, warranties and manuals"),
      feature("manual-reminders", "Care-Loops und Erinnerungen", "Care loops and reminders"),
      feature("ai-extraction", "Basis-KI-Extraktion mit Fair Use", "Basic AI extraction with fair use"),
      feature("private-vault", "Datenexport und Private Vault Basic", "Data export and Private Vault Basic")
    ],
    limits: {
      items: 1000,
      documents: 1000,
      storageMb: 5120,
      reminders: null,
      warrantyTracking: null,
      aiUsage: 100,
      vaultSpaces: 1,
      sharedSpaces: 0,
      customFields: 20,
      exports: 12
    },
    isPopular: true,
    isAvailable: true,
    ctaLabel: { de: "Personal wählen", en: "Choose Personal" },
    ctaHref: "/signup?plan=personal",
    yearlyNote: { de: "2 Monate sparen", en: "Save 2 months" }
  },
  {
    id: "pro",
    name: "Pro",
    description: {
      de: "Für power-user, Selbstständige und größere Objektgedächtnisse.",
      en: "For power users, freelancers and larger object memories."
    },
    monthlyPrice: 15,
    yearlyPrice: 150,
    currency: "EUR",
    features: [
      feature("object-memory", "Alles aus Personal mit höheren Limits", "Everything in Personal with higher limits"),
      feature("custom-fields", "Eigene Felder und erweiterte Struktur", "Custom fields and extended structure"),
      feature("exports", "Mehr Exporte für Versicherung und Support", "More exports for insurance and support"),
      feature("priority-care", "Mehr Care- und Garantie-Kontext", "More care and warranty context")
    ],
    limits: {
      items: 3000,
      documents: 3000,
      storageMb: 15360,
      reminders: null,
      warrantyTracking: null,
      aiUsage: 300,
      vaultSpaces: 2,
      sharedSpaces: 1,
      customFields: 80,
      exports: null
    },
    isPopular: false,
    isAvailable: true,
    ctaLabel: { de: "Pro wählen", en: "Choose Pro" },
    ctaHref: "/signup?plan=pro",
    yearlyNote: { de: "2 Monate sparen", en: "Save 2 months" }
  },
  {
    id: "family",
    name: "Family",
    description: {
      de: "Für Haushalte, Familie und gemeinsame Verantwortung.",
      en: "For households, families and shared responsibility."
    },
    monthlyPrice: 19,
    yearlyPrice: 190,
    currency: "EUR",
    features: [
      feature("object-memory", "Alles aus Pro", "Everything in Pro"),
      feature("shared-spaces", "Mehrere Haushaltsmitglieder", "Multiple household members"),
      feature("manual-reminders", "Geteilte Dinge und Erinnerungen", "Shared things and reminders"),
      feature("ai-extraction", "Mehr Speicher und KI-Fair-Use", "More storage and AI fair use"),
      feature("private-vault", "Erweiterter Private Vault", "Extended Private Vault")
    ],
    limits: {
      items: 6000,
      documents: 6000,
      storageMb: 30720,
      reminders: null,
      warrantyTracking: null,
      aiUsage: 600,
      vaultSpaces: 4,
      sharedSpaces: 4,
      customFields: null,
      exports: null
    },
    isPopular: false,
    isAvailable: false,
    ctaLabel: { de: "Family vormerken", en: "Reserve Family" },
    ctaHref: "/pricing",
    unavailableLabel: { de: "Bald verfügbar", en: "Coming soon" },
    yearlyNote: { de: "2 Monate sparen", en: "Save 2 months" }
  }
] satisfies SubscriptionPlan[];

export function getPlanById(planId: PlanId | string): SubscriptionPlan {
  return subscriptionPlans.find((plan) => plan.id === planId) ?? subscriptionPlans[0];
}

export function getPlanLimits(planId: PlanId | string): PlanLimits {
  return getPlanById(planId).limits;
}

export function canUseFeature(planId: PlanId | string, featureId: PlanFeatureId): boolean {
  return getPlanById(planId).features.some((featureItem) => featureItem.id === featureId);
}

export function isWithinPlanLimit(planId: PlanId | string, limitKey: PlanLimitKey, currentUsage: number, requestedAmount = 1): boolean {
  const limit = getPlanLimits(planId)[limitKey];
  return limit === null || currentUsage + requestedAmount <= limit;
}

export function formatPrice(planOrPrice: SubscriptionPlan | number, period: BillingPeriod = "monthly", locale = "de-DE"): string {
  const planPrice = typeof planOrPrice === "number"
    ? planOrPrice
    : period === "yearly" ? planOrPrice.yearlyPrice : planOrPrice.monthlyPrice;
  const currency = typeof planOrPrice === "number" ? "EUR" : planOrPrice.currency;

  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency"
  }).format(planPrice);
}

export function publicPricingPlans(): SubscriptionPlan[] {
  return [...subscriptionPlans];
}

function feature(id: PlanFeatureId, de: string, en: string): PlanFeature {
  return { id, label: { de, en } };
}
