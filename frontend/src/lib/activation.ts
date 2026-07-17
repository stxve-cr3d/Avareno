import { api } from "./api";

export type ActivationSummary = {
  registrationCompletedAt: string | null;
  onboardingStartedAt: string | null;
  onboardingCompletedAt: string | null;
  onboardingDismissedAt: string | null;
  firstProductDetailOpenedAt: string | null;
  firstProductCreatedAt: string | null;
  firstDocumentUploadedAt: string | null;
  activationA: boolean;
  activationB: boolean;
  itemCount: number;
  linkedDocumentCount: number;
  timeToFirstProductSeconds: number | null;
  timeToFirstDocumentSeconds: number | null;
  nextPath: string;
};

export type ActivationAction = "onboarding_started" | "onboarding_dismissed" | "product_detail_opened";

export function getActivationSummary() {
  return api<ActivationSummary>("/api/me/activation");
}

export function recordActivationAction(action: ActivationAction) {
  return api<ActivationSummary>("/api/me/activation", {
    method: "POST",
    body: JSON.stringify({ action })
  });
}

export async function resolvePostAuthPath(preferredPath = "/app") {
  try {
    const summary = await getActivationSummary();
    return summary.nextPath === "/app" ? preferredPath : summary.nextPath;
  } catch {
    return preferredPath;
  }
}
