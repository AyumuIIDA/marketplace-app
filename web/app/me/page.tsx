import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../src/components/layout/marketplace-shell";
import { StatePanel } from "../../src/components/ui/state-panel";
import { ProfileSidebar } from "../../src/features/account/components/profile-sidebar";
import { AgentAccessPanel } from "../../src/features/agent-access/components/agent-access-panel";
import { toShellUserLabels } from "../../src/features/current-user/shell-user";
import { ListingGrid } from "../../src/features/listings/components/listing-grid";
import { SellerCard } from "../../src/features/listings/components/seller-card";
import { mapListingsToViewModels } from "../../src/features/listings/listing.mapper";
import { TransactionList } from "../../src/features/orders/components/transaction-list";
import { getCurrentUser } from "../../src/lib/api/current-user.api";
import { searchMyListings } from "../../src/lib/api/listings.api";
import { listOrders } from "../../src/lib/api/orders.api";
import { searchLikedListings, searchLikedSellers } from "../../src/lib/api/social.api";
import { ensureOnboarded } from "../../src/lib/auth/onboarding";

export const dynamic = "force-dynamic";

type MePageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const TABS = ["purchases", "listings", "likes", "connect"] as const;
type TabKey = (typeof TABS)[number];

export default async function MePage({ searchParams }: MePageProps) {
  await ensureOnboarded("/me");
  const [{ tab }, currentUser, listings, likedListings, likedSellers, orders, t, social, tx] = await Promise.all([
    searchParams,
    getCurrentUser(),
    searchMyListings({ limit: 50 }),
    searchLikedListings(50),
    searchLikedSellers(50),
    listOrders({ limit: 50 }),
    getTranslations("pages.me"),
    getTranslations("social"),
    getTranslations("transaction"),
  ]);
  const { humanLabel, humanVerified, userLabel } = toShellUserLabels(currentUser);

  if (currentUser === undefined) {
    return (
      <MarketplaceShell activeSection="me" authenticated={false} humanLabel={humanLabel} humanVerified={humanVerified} userLabel={userLabel}>
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      </MarketplaceShell>
    );
  }

  const purchases = orders.filter((order) => order.buyerId === currentUser.userId);
  const active: TabKey = TABS.includes(tab as TabKey) ? (tab as TabKey) : "purchases";
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "purchases", label: t("tabPurchases"), count: purchases.length },
    { key: "listings", label: t("tabListings"), count: listings.length },
    { key: "likes", label: t("tabLikes"), count: likedListings.length },
    { key: "connect", label: t("tabConnect") },
  ];

  return (
    <MarketplaceShell activeSection="me" authenticated humanLabel={humanLabel} humanVerified={humanVerified} userLabel={userLabel}>
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <ProfileSidebar currentUser={currentUser} listingsCount={listings.length} purchasesCount={purchases.length} />

        <div className="min-w-0">
          {/* GitHub型のタブバー。実リンク=SSR切替・キーボード可・共有可。 */}
          {/* overflow-x-auto は overflow-y を auto に昇格させる。タブの -mb-px の1px溢れで縦スクロールバーが出るため y を明示的に隠す。 */}
          <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
            {tabs.map((item) => {
              const selected = item.key === active;

              return (
                <a
                  aria-current={selected ? "page" : undefined}
                  className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    selected ? "border-seal text-ink" : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                  href={item.key === "purchases" ? "/me" : `/me?tab=${item.key}`}
                  key={item.key}
                >
                  {item.label}
                  {item.count !== undefined && (
                    <span className="rounded-full bg-paper px-1.5 font-mono text-[11px] text-ink-soft ring-1 ring-line">
                      {item.count}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          <div className="mt-6">
            {active === "purchases" && (
              <TransactionList currentUserId={currentUser.userId} emptyLabel={tx("emptyPurchases")} orders={purchases} />
            )}

            {active === "listings" &&
              (listings.length === 0 ? (
                <StatePanel actionHref="/listings/new" actionLabel={t("emptyAction")} title={t("emptyTitle")}>
                  {t("emptyBody")}
                </StatePanel>
              ) : (
                <ListingGrid listings={mapListingsToViewModels(listings)} />
              ))}

            {active === "likes" && (
              <div className="space-y-8">
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{social("likedItems")}</h2>
                  {likedListings.length === 0 ? (
                    <p className="text-sm text-ink-soft">{social("likedItemsEmpty")}</p>
                  ) : (
                    // いいね済の本体一覧。全件いいね済なのでハートを点灯させる。
                    // 非PUBLISHED（売却済/非公開）は非出品者には開けない(403)ため、リンクを無効化する。
                    <ListingGrid
                      blockUnviewable
                      listings={mapListingsToViewModels(likedListings, new Set(likedListings.map((l) => l.listingId)))}
                    />
                  )}
                </section>
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-ink">{social("likedSellers")}</h2>
                  {likedSellers.length === 0 ? (
                    <p className="text-sm text-ink-soft">{social("likedSellersEmpty")}</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {likedSellers.map((seller) => (
                        <SellerCard key={seller.sellerId} seller={seller} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {active === "connect" && <AgentAccessPanel />}
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}
