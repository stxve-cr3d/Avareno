import type { CSSProperties } from "react";
import type { HomeProvider } from "../types";

type ProviderLogoProps = {
  provider: HomeProvider;
  size?: "sm" | "md" | "lg";
};

const localLogoAssets: Partial<Record<string, string>> = {
  // TODO: Add licensed local SVG/logo assets here after brand/legal review.
};

export function ProviderLogo({ provider, size = "md" }: ProviderLogoProps) {
  const asset = localLogoAssets[provider.logoKey];
  const initials = providerInitials(provider.name);

  if (asset) {
    return (
      <span className={`av-provider-logo av-provider-logo-${size}`}>
        <img src={asset} alt="" loading="lazy" />
      </span>
    );
  }

  return (
    <span
      className={`av-provider-logo av-provider-logo-${size} is-fallback`}
      style={{ "--provider-color": provider.brandColor ?? "#3ECF8E" } as CSSProperties}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function providerInitials(name: string) {
  const cleaned = name.replace(/[!/+]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}
