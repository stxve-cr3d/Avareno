import type { ReactNode } from "react";

/* Maps legacy badge tones onto the av-* status vocabulary. */
const tones = {
  green: "av-tone-green",
  amber: "av-tone-amber",
  red: "av-tone-red",
  dark: "av-tone-neutral",
  gray: "av-tone-neutral",
  sky: "av-tone-teal",
  coral: "av-tone-red"
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`av-chip ${tones[tone]}`}>{children}</span>;
}
