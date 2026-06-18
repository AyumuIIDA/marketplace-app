import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { BackLink } from "../../../components/ui/back-link";
import { DetailRow } from "../../../components/ui/detail-row";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { Seal } from "../../../components/ui/seal";
import { StatePanel } from "../../../components/ui/state-panel";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { CurrentUser } from "../../../lib/api/current-user.api";
import type { Listing } from "../../../lib/api/listings.api";
import { getSellerSummary } from "../../../lib/api/sellers.api";
import { WorldcoinPayButton } from "../../payments/components/worldcoin-pay-button";
import { toggleListingLikeAction } from "../../social/actions/social.actions";
import { LikeButton } from "../../social/components/like-button";
import { publishListingAction, purchaseListingAction } from "../actions/listing.actions";
import { PublishListingButton } from "./publish-listing-button";
import { SellerCard } from "./seller-card";

type ListingDetailViewProps = {
  currentUser: CurrentUser | undefined;
  listing: Listing | undefined;
};

export async function ListingDetailView({ currentUser, listing }: ListingDetailViewProps) {
  const [t, social] = await Promise.all([getTranslations("listing"), getTranslations("social")]);

  if (listing === undefined) {
    return <StatePanel actionHref="/" actionLabel={t("backAction")} title={t("unavailableTitle")} />;
  }

  const isSeller = currentUser?.userId === listing.sellerId;
  const canPurchase = currentUser !== undefined && !isSeller && listing.status === "PUBLISHED";
  const signed = listing.signatureId !== undefined;
  const seller = await getSellerSummary(listing.sellerId);

  return (
    <div className="space-y-5">
      <BackLink href="/" label={t("backAction")} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <GlassPanel className="overflow-hidden p-0">
        {listing.images.length > 0 ? (
          <div className="border-b border-line bg-paper">
            {/* 商品画像はブラウザが storage を直接読む公開アセット */}
            <img
              alt={listing.title}
              className="aspect-square w-full object-contain"
              src={listing.images[0].url}
            />
            {listing.images.length > 1 && (
              <div className="flex gap-2 p-3">
                {listing.images.map((image) => (
                  <img
                    alt=""
                    className="size-16 rounded-md border border-line object-cover"
                    key={image.sortOrder}
                    loading="lazy"
                    src={image.url}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone={listing.status === "PUBLISHED" ? "good" : "neutral"}>{listing.status}</StatusBadge>
            <StatusBadge tone={signed ? "seal" : "warn"}>
              {signed ? t("signed") : t("unsigned")}
            </StatusBadge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">{listing.title}</h2>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="font-mono text-2xl font-semibold text-ink">¥{listing.price.toLocaleString("ja-JP")}</p>
            <LikeButton
              ariaLabel={social("likeItem")}
              text={{ like: social("likeItem"), liked: social("likedItem") }}
              toggleAction={toggleListingLikeAction.bind(null, listing.listingId)}
            />
          </div>
          <p className="mt-5 whitespace-pre-line text-sm leading-7 text-ink-soft">{listing.description}</p>
          <dl className="mt-8 rounded-md border border-line bg-paper p-4">
            <DetailRow label={t("category")} value={listing.category} />
            <DetailRow label={t("condition")} value={listing.condition} />
          </dl>
        </div>
      </GlassPanel>

      <div className="space-y-4">
        <SellerCard seller={seller} />

        {/* Human-signature trust block — 核となる差別化点を明示説明 */}
        <GlassPanel className="p-5">
          <div className="flex items-start gap-3">
            <Seal size="md" tone="light" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-ink">{signed ? t("signedTitle") : t("unsignedTitle")}</h3>
              <p className="mt-1 text-xs leading-5 text-ink-soft">
                {signed ? t("signedExplain") : t("unsignedExplain")}
              </p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-ink">{t("actions")}</h3>
          {currentUser === undefined && (
            <div className="mt-4">
              <ActionButton href="/signin" variant="primary">
                {t("signInToBuy")}
              </ActionButton>
            </div>
          )}
          {isSeller && listing.status === "DRAFT" && (
            <div className="mt-4 space-y-4">
              {/* ブランドの核＝本人署名公開を主導線に。ログインのみ公開は副次に置く。 */}
              <div className="space-y-1.5">
                <PublishListingButton label={t("publishSigned")} listing={listing} />
                <p className="text-xs leading-5 text-ink-soft">{t("publishSignedHint")}</p>
              </div>
              <form action={publishListingAction} className="space-y-1.5 border-t border-line pt-4">
                <input name="listingId" type="hidden" value={listing.listingId} />
                <ActionButton className="w-full" type="submit" variant="secondary">
                  {t("publish")}
                </ActionButton>
                <p className="text-xs leading-5 text-ink-soft">{t("publishUnsignedHint")}</p>
              </form>
            </div>
          )}
          {canPurchase && (
            <div className="mt-4 space-y-4">
              <form action={purchaseListingAction} className="space-y-1.5">
                <input name="listingId" type="hidden" value={listing.listingId} />
                <ActionButton className="w-full" type="submit" variant="primary">
                  {t("buyConfirm")}
                </ActionButton>
                <p className="text-xs leading-5 text-ink-soft">{t("buyConfirmHint")}</p>
              </form>
              {currentUser.humanVerified && (
                <div className="space-y-1.5 border-t border-line pt-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                    {t("payOnchain")}
                  </p>
                  <WorldcoinPayButton jpyPrice={listing.price} listingId={listing.listingId} />
                  <p className="text-xs leading-5 text-ink-soft">{t("worldPayHint")}</p>
                </div>
              )}
            </div>
          )}
          {!canPurchase && currentUser !== undefined && !isSeller && (
            <p className="mt-3 text-sm leading-6 text-ink-soft">{t("notPurchasable")}</p>
          )}
        </GlassPanel>
      </div>
      </div>
    </div>
  );
}
