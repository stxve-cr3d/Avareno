export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-leaf/12">
      <div className="h-full rounded-full bg-gradient-to-r from-leaf to-sky transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}
