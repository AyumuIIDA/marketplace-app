"use client";

import { useLocale } from "next-intl";

import { categoryLabel } from "../category-labels";

// カテゴリスラッグを現在ロケールの表示名で描画する。client island なので server component 内でも使える。
export function CategoryLabel({ slug }: { slug: string }) {
  const locale = useLocale();
  return <>{categoryLabel(slug, locale)}</>;
}
