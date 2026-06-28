import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="av-empty">
      <p className="av-empty-title">{title}</p>
      {children ? <div className="av-empty-body">{children}</div> : null}
    </div>
  );
}
