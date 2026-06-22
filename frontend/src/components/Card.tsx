import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`surface rounded-lg p-4 md:p-5 ${className}`} {...props} />;
}
