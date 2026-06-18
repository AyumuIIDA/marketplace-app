import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../src/components/layout/page-header";
import { ActionButton } from "../../../src/components/ui/action-button";
import { Avatar } from "../../../src/components/ui/avatar";
import { GlassPanel } from "../../../src/components/ui/glass-panel";
import { Seal } from "../../../src/components/ui/seal";
import { StatePanel } from "../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../src/features/current-user/shell-user";
import { ListingGrid } from "../../../src/features/listings/components/listing-grid";
import { mapListingsToViewModels } from "../../../src/features/listings/listing.mapper";
import { toggleSellerLikeAction } from "../../../src/features/social/actions/social.actions";
import { LikeButton } from "../../../src/features/social/components/like-button";
import { StarRating } from "../../../src/features/social/components/star-rating";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { searchListings } from "../../../src/lib/api/listings.api";
import { getSellerSummary } from "../../../src/lib/api/sellers.api";

export const dynamic = "force-dynamic";

type SellerProfilePageProps = {
  params: Promise<{ sellerId: string }>;
};

export default async function SellerProfilePage({ params }: SellerProfilePageProps) {
  const { sellerId } = await params;
  const [currentUser, seller, listings, t, social] = await Promise.all([
    getCurrentUser(),
    getSellerSummary(sellerId),
    searchListings({ sellerId, limit: 24 }),
    getTranslations("sellerProfile"),
    getTranslations("social"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);
  const items = mapListingsToViewModels(listings);
  const isSelf = currentUser?.userId === seller.sellerId;

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <div className="space-y-6">
        <GlassPanel className="p-6">
          <div className="flex items-center gap-4">
            <Avatar alt="" className="size-16" seed={seller.displayName || seller.handle} src={seller.avatarUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-xl font-bold text-ink">{seller.displayName}</h2>
                {seller.humanVerified && <Seal label={social("verifiedSeller")} size="sm" />}
              </div>
              <p className="truncate font-mono text-xs text-ink-faint">{seller.handle}</p>
              <div className="mt-1.5 flex items-center gap-2">
                {seller.rating === undefined ? (
                  <span className="text-xs text-ink-faint">{social("noRating")}</span>
                ) : (
                  <>
                    <StarRating value={seller.rating} />
                    <span className="font-mono text-xs text-ink-soft">
                      {seller.rating.toFixed(1)} · {social("reviewCount", { count: seller.reviewCount })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {isSelf ? (
            <div className="mt-4">
              <ActionButton href="/me" variant="secondary">
                {t("editProfile")}
              </ActionButton>
            </div>
          ) : (
            <div className="mt-4">
              <LikeButton
                ariaLabel={social("likeSeller")}
                initialCount={seller.likeCount}
                initialLiked={seller.likedByMe}
                showCount
                text={{ like: social("likeSeller"), liked: social("likedSeller") }}
                toggleAction={toggleSellerLikeAction.bind(null, seller.sellerId)}
              />
            </div>
          )}
        </GlassPanel>

        <section>
          <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
            <h3 className="text-sm font-semibold text-ink">{t("listings")}</h3>
            <span className="font-mono text-xs text-ink-faint">{t("count", { count: items.length })}</span>
          </div>
          {items.length === 0 ? (
            <StatePanel title={t("emptyTitle")}>{t("emptyBody")}</StatePanel>
          ) : (
            <ListingGrid listings={items} />
          )}
        </section>
      </div>
    </MarketplaceShell>
  );
}
