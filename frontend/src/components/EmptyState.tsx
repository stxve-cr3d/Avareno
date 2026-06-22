import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/78 p-6 text-center shadow-soft">
      <p className="text-base font-black text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm font-semibold leading-6 text-muted">{children}</div> : null}
    </div>
  );
}
