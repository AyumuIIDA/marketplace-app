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
import { SellerReviews } from "../../../src/features/reviews/components/seller-reviews";
import { toggleSellerFollowAction, toggleSellerLikeAction } from "../../../src/features/social/actions/social.actions";
import { FollowButton } from "../../../src/features/social/components/follow-button";
import { LikeButton } from "../../../src/features/social/components/like-button";
import { StarRating } from "../../../src/features/social/components/star-rating";
import { getCurrentUser } from "../../../src/lib/api/current-user.api";
import { searchListings } from "../../../src/lib/api/listings.api";
import { listReviews } from "../../../src/lib/api/reviews.api";
import { getSellerSummary } from "../../../src/lib/api/sellers.api";

export const dynamic = "force-dynamic";

type SellerProfilePageProps = {
  params: Promise<{ sellerId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const SELLER_TABS = ["listings", "reviews"] as const;
type SellerTab = (typeof SELLER_TABS)[number];

export default async function SellerProfilePage({ params, searchParams }: SellerProfilePageProps) {
  const { sellerId } = await params;
  const [{ tab }, currentUser, seller, listings, reviews, t, social] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getSellerSummary(sellerId),
    searchListings({ sellerId, limit: 24 }),
    listReviews({ revieweeId: sellerId, limit: 50 }),
    getTranslations("sellerProfile"),
    getTranslations("social"),
  ]);
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);
  const items = mapListingsToViewModels(listings);
  const isSelf = currentUser?.userId === seller.sellerId;
  const active: SellerTab = SELLER_TABS.includes(tab as SellerTab) ? (tab as SellerTab) : "listings";
  const tabs: { key: SellerTab; label: string; count: number }[] = [
    { key: "listings", label: t("listings"), count: items.length },
    { key: "reviews", label: t("reviews"), count: reviews.length },
  ];

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel} humanVerified={humanVerified}
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* フォロー（私的・認証不要）。誰でも押せる受け皿。 */}
              <FollowButton
                initialFollowing={seller.followingByMe}
                text={{ follow: social("follow"), following: social("following") }}
                toggleAction={toggleSellerFollowAction.bind(null, seller.sellerId)}
              />
              {/* いいね（公開シグナル・認証必須）。未認証は押すと 403→巻き戻る。 */}
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

        {/* GitHub/me 型のタブ。出品と評価を並列に切替（SSR・共有可）。 */}
        <div>
          <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
            {tabs.map((item) => {
              const selected = item.key === active;
              return (
                <a
                  aria-current={selected ? "page" : undefined}
                  className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    selected ? "border-seal text-ink" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                  href={item.key === "listings" ? `/sellers/${sellerId}` : `/sellers/${sellerId}?tab=${item.key}`}
                  key={item.key}
                >
                  {item.label}
                  <span className="rounded-full bg-paper px-1.5 font-mono text-[11px] text-ink-soft ring-1 ring-line">
                    {item.count}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className="mt-6">
            {active === "listings" &&
              (items.length === 0 ? (
                <StatePanel title={t("emptyTitle")}>{t("emptyBody")}</StatePanel>
              ) : (
                <ListingGrid listings={items} />
              ))}

            {active === "reviews" && <SellerReviews reviews={reviews} />}
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}
