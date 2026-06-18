import { getTranslations } from "next-intl/server";

import { MarketplaceShell } from "../../../../src/components/layout/marketplace-shell";
import { PageHeader } from "../../../../src/components/layout/page-header";
import { ActionButton } from "../../../../src/components/ui/action-button";
import { BackLink } from "../../../../src/components/ui/back-link";
import { DetailRow } from "../../../../src/components/ui/detail-row";
import { GlassPanel } from "../../../../src/components/ui/glass-panel";
import { Seal } from "../../../../src/components/ui/seal";
import { StatePanel } from "../../../../src/components/ui/state-panel";
import { toShellUserLabels } from "../../../../src/features/current-user/shell-user";
import { purchaseListingAction } from "../../../../src/features/listings/actions/listing.actions";
import { WorldcoinPayButton } from "../../../../src/features/payments/components/worldcoin-pay-button";
import { getCurrentUser } from "../../../../src/lib/api/current-user.api";
import { getListing } from "../../../../src/lib/api/listings.api";
import { getSellerSummary } from "../../../../src/lib/api/sellers.api";

export const dynamic = "force-dynamic";

type PurchasePageProps = {
  params: Promise<{ listingId: string }>;
};

export default async function PurchasePage({ params }: PurchasePageProps) {
  const { listingId } = await params;
  const [currentUser, listing, t] = await Promise.all([
    getCurrentUser(),
    getListing(listingId),
    getTranslations("purchase"),
  ]);
  const { humanLabel, userLabel } = toShellUserLabels(currentUser);

  const isSeller = currentUser !== undefined && listing !== undefined && currentUser.userId === listing.sellerId;
  const purchasable =
    currentUser !== undefined && listing !== undefined && !isSeller && listing.status === "PUBLISHED";
  const seller = purchasable ? await getSellerSummary(listing.sellerId) : undefined;

  return (
    <MarketplaceShell
      activeSection="catalog"
      authenticated={currentUser !== undefined}
      humanLabel={humanLabel}
      userLabel={userLabel}
    >
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      {currentUser === undefined ? (
        <StatePanel actionHref="/signin" actionLabel={t("signInAction")} title={t("signInTitle")}>
          {t("signInBody")}
        </StatePanel>
      ) : listing === undefined || listing.status !== "PUBLISHED" ? (
        <StatePanel actionHref="/" actionLabel={t("backToListings")} title={t("unavailableTitle")}>
          {t("unavailableBody")}
        </StatePanel>
      ) : isSeller ? (
        <StatePanel actionHref={`/listings/${listingId}`} actionLabel={t("back")} title={t("ownTitle")}>
          {t("ownBody")}
        </StatePanel>
      ) : (
        <div className="mx-auto max-w-lg space-y-5">
          <BackLink href={`/listings/${listingId}`} label={t("back")} />
          <GlassPanel className="p-6">
            <div className="flex gap-4">
              {listing.images[0] !== undefined ? (
                // 商品画像はブラウザが storage を直接読む公開アセット
                <img
                  alt=""
                  className="size-24 shrink-0 rounded-md border border-line object-cover"
                  src={listing.images[0].url}
                />
              ) : (
                <span className="grid size-24 shrink-0 place-items-center rounded-md border border-line bg-paper font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  no photo
                </span>
              )}
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-base font-semibold text-ink">{listing.title}</h2>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="truncate text-sm text-ink-soft">{seller?.displayName}</span>
                  {seller?.humanVerified && <Seal label={t("verifiedSeller")} size="sm" />}
                </div>
              </div>
            </div>

            <dl className="mt-5 rounded-md border border-line bg-paper p-4">
              <DetailRow label={t("price")} value={`¥${listing.price.toLocaleString("ja-JP")}`} />
              <DetailRow label={t("paymentLabel")} value={t("paymentNote")} />
            </dl>

            <form action={purchaseListingAction} className="mt-5 space-y-1.5">
              <input name="listingId" type="hidden" value={listingId} />
              <ActionButton className="w-full" type="submit" variant="primary">
                {t("confirm")}
              </ActionButton>
              <p className="text-xs leading-5 text-ink-soft">{t("confirmHint")}</p>
            </form>

            {currentUser.humanVerified && (
              <div className="mt-5 space-y-1.5 border-t border-line pt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">{t("payOnchain")}</p>
                <WorldcoinPayButton jpyPrice={listing.price} listingId={listingId} />
                <p className="text-xs leading-5 text-ink-soft">{t("worldPayHint")}</p>
              </div>
            )}
          </GlassPanel>
        </div>
      )}
    </MarketplaceShell>
  );
}
