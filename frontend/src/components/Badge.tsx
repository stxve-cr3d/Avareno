import type { ReactNode } from "react";

const tones = {
  green: "bg-leaf/10 text-moss ring-leaf/20",
  amber: "bg-amber-50 text-amber ring-amber-200",
  red: "bg-red-50 text-ember ring-red-200",
  dark: "bg-coal text-white ring-coal",
  gray: "bg-mist text-ink ring-line",
  sky: "bg-sky-50 text-sky ring-sky-200",
  coral: "bg-orange-50 text-coral ring-orange-200"
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${tones[tone]}`}>{children}</span>;
}
