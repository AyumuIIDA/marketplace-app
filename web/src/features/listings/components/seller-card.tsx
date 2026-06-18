import { getTranslations } from "next-intl/server";

import { GlassPanel } from "../../../components/ui/glass-panel";
import { Seal } from "../../../components/ui/seal";
import type { SellerSummary } from "../../../lib/api/sellers.api";
import { toggleSellerLikeAction } from "../../social/actions/social.actions";
import { LikeButton } from "../../social/components/like-button";
import { StarRating } from "../../social/components/star-rating";

type SellerCardProps = {
  seller: SellerSummary;
};

export async function SellerCard({ seller }: SellerCardProps) {
  const t = await getTranslations("social");

  return (
    <GlassPanel className="p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("sellerLabel")}</p>

      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-sm font-semibold text-ink-soft ring-1 ring-line">
          {(seller.displayName || seller.handle.replace("@", "")).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">{seller.displayName}</span>
            {seller.humanVerified && <Seal label={t("verifiedSeller")} size="sm" />}
          </div>
          <p className="truncate font-mono text-xs text-ink-faint">{seller.handle}</p>
          <div className="mt-1 flex items-center gap-2">
            {seller.rating === undefined ? (
              <span className="text-xs text-ink-faint">{t("noRating")}</span>
            ) : (
              <>
                <StarRating value={seller.rating} />
                <span className="font-mono text-xs text-ink-soft">
                  {seller.rating.toFixed(1)} · {t("reviewCount", { count: seller.reviewCount })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <LikeButton
          ariaLabel={t("likeSeller")}
          initialCount={seller.likeCount}
          initialLiked={seller.likedByMe}
          showCount
          text={{ like: t("likeSeller"), liked: t("likedSeller") }}
          toggleAction={toggleSellerLikeAction.bind(null, seller.sellerId)}
        />
      </div>
    </GlassPanel>
  );
}
