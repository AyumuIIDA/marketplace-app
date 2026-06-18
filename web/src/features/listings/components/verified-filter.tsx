"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Seal } from "../../../components/ui/seal";

// 「本人署名のみ」トグル。?verified=1 を切り替え、他のクエリは維持する。
// human-backed をブラウズの絞り込み軸として前面に出す。
export function VerifiedFilter({ active }: { active: boolean }) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function toggle() {
    const search = new URLSearchParams(params.toString());

    if (active) {
      search.delete("verified");
    } else {
      search.set("verified", "1");
    }

    router.push(search.size > 0 ? `${pathname}?${search.toString()}` : pathname);
  }

  return (
    <button
      aria-pressed={active}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full border border-seal bg-seal-tint px-3 py-1.5 text-sm font-semibold text-seal-strong"
          : "inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-seal hover:text-seal-strong"
      }
      onClick={toggle}
      type="button"
    >
      <Seal size="sm" />
      {t("verifiedOnly")}
    </button>
  );
}
