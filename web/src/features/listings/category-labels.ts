// カテゴリ（abo 由来スラッグ）の日本語/英語対訳。カテゴリのライフサイクルは未管理のため、
// 表示名はここで集中管理する（DB はスラッグのまま＝シード/AI 制約と一致）。未知スラッグはそのまま表示。
export const CATEGORY_LABELS: Record<string, { ja: string; en: string }> = {
  bags_accessories: { ja: "バッグ・小物", en: "Bags & accessories" },
  beauty_health: { ja: "美容・健康", en: "Beauty & health" },
  bedding_bath: { ja: "寝具・バス", en: "Bedding & bath" },
  furniture: { ja: "家具", en: "Furniture" },
  grocery: { ja: "食品・飲料", en: "Grocery" },
  home_decor: { ja: "インテリア・雑貨", en: "Home decor" },
  jewelry: { ja: "ジュエリー", en: "Jewelry" },
  kitchen: { ja: "キッチン用品", en: "Kitchen" },
  lighting: { ja: "照明", en: "Lighting" },
  pet_office_sports: { ja: "ペット・文具・スポーツ", en: "Pet, office & sports" },
  phone_accessories: { ja: "スマホアクセサリ", en: "Phone accessories" },
  shoes: { ja: "シューズ", en: "Shoes" },
};

// CATEGORY_SLUGS は abo 由来の正準カテゴリ（出品フォームの選択肢の正本）。DB/AI 制約と一致する。
export const CATEGORY_SLUGS = Object.keys(CATEGORY_LABELS);

// categoryLabel はスラッグを指定ロケールの表示名へ変換する（select の option 等、非コンポーネント用途向け）。
export function categoryLabel(slug: string, locale: string): string {
  return CATEGORY_LABELS[slug]?.[locale === "ja" ? "ja" : "en"] ?? slug;
}
