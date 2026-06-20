import { getTranslations } from "next-intl/server";

import { similarListings } from "../../../lib/api/recommendations.api";

// SimilarListings は画像→画像の類似商品（/recommendations/similar/{id}）を商品詳細末尾に出す。
// ベクトルサービス未稼働/未デプロイ時は空配列で返るため、その場合は何も描画しない（安全に縮退）。
export async function SimilarListings({ listingId }: { listingId: string }) {
  const items = await similarListings(listingId, 12);
  if (items.length === 0) {
    return null;
  }
  const t = await getTranslations("listing");

  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="mb-4 text-base font-semibold text-ink">{t("relatedTitle")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <a
            className="group flex flex-col overflow-hidden rounded-lg border border-line bg-paper transition-colors hover:border-seal/60"
            href={`/listings/${item.listingId}`}
            key={item.listingId}
          >
            <div className="relative aspect-square bg-surface">
              {item.images?.[0]?.url !== undefined ? (
                // 商品画像はブラウザが storage を直接読む公開アセット
                <img
                  alt={item.title}
                  className="size-full object-cover"
                  loading="lazy"
                  src={item.images[0].url}
                />
              ) : (
                <span className="grid size-full place-items-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  no photo
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 p-2.5">
              <p className="line-clamp-2 text-xs font-medium leading-snug text-ink">{item.title}</p>
              <p className="mt-auto font-mono text-sm font-semibold text-ink">
                ¥{item.price.toLocaleString("ja-JP")}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
