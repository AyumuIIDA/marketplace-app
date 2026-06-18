// ルート遷移中のフォールバック。控えめな朱のスピナーのみ。
export default function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center bg-paper">
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-line border-t-seal motion-reduce:animate-none"
      />
    </div>
  );
}
