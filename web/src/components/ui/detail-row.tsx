type DetailRowProps = {
  label: string;
  value: string;
};

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 py-3 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</dt>
      <dd className="max-w-[70%] text-right text-sm font-medium text-neutral-800">{value}</dd>
    </div>
  );
}
