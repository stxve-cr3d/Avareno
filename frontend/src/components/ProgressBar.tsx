export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded bg-emerald-100">
      <div className="h-full rounded bg-gradient-to-r from-leaf to-sky transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
