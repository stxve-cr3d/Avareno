export type PaymentMethodStatus = "active" | "comingSoon";

export type PaymentMethodDisplay = {
  id: string;
  status: PaymentMethodStatus;
  label: {
    de: string;
    en: string;
  };
};

export const checkoutPaymentMethods: PaymentMethodDisplay[] = [
  { id: "cards", status: "active", label: { de: "Karten", en: "Cards" } },
  { id: "apple_pay", status: "active", label: { de: "Apple Pay", en: "Apple Pay" } },
  { id: "amazon_pay", status: "active", label: { de: "Amazon Pay", en: "Amazon Pay" } },
  { id: "link", status: "active", label: { de: "Link", en: "Link" } },
  { id: "eps", status: "active", label: { de: "EPS", en: "EPS" } },
  { id: "klarna", status: "active", label: { de: "Klarna", en: "Klarna" } },
  { id: "sepa_credit_transfer", status: "comingSoon", label: { de: "SEPA-Überweisung", en: "SEPA bank transfer" } }
];

export function getCheckoutPaymentMethodLabels(language: "de" | "en", status?: PaymentMethodStatus) {
  return checkoutPaymentMethods
    .filter((method) => !status || method.status === status)
    .map((method) => method.label[language]);
}
