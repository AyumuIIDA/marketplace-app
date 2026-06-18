// 詳細・取引ページの戻り導線。一覧へ戻る経路を明示する。
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      href={href}
    >
      <span aria-hidden>←</span>
      {label}
    </a>
  );
}
