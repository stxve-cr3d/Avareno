import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm text-ink/60">{children}</div> : null}
    </div>
  );
}
