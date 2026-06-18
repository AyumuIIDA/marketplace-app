type DetailRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

export function DetailRow({ label, mono = false, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd
        className={
          mono
            ? "max-w-[70%] truncate text-right font-mono text-xs text-ink-soft"
            : "max-w-[70%] text-right text-sm font-medium text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
