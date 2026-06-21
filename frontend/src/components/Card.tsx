import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-lg border border-line bg-paper p-4 shadow-soft ${className}`} {...props} />;
}
