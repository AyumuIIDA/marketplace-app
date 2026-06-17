import { ActionButton } from "../../../components/ui/action-button";
import { DetailRow } from "../../../components/ui/detail-row";
import { GlassPanel } from "../../../components/ui/glass-panel";
import { StatePanel } from "../../../components/ui/state-panel";
import { StatusBadge } from "../../../components/ui/status-badge";
import type { CurrentUser } from "../../../lib/api/current-user.api";
import type { Listing } from "../../../lib/api/listings.api";
import { WorldcoinPayButton } from "../../payments/components/worldcoin-pay-button";
import { purchaseListingAction } from "../actions/listing.actions";
import { PublishListingButton } from "./publish-listing-button";

type ListingDetailViewProps = {
  currentUser: CurrentUser | undefined;
  listing: Listing | undefined;
};

export function ListingDetailView({ currentUser, listing }: ListingDetailViewProps) {
  if (listing === undefined) {
    return (
      <StatePanel actionHref="/" actionLabel="Back to listings" title="Listing is not available" />
    );
  }

  const isSeller = currentUser?.userId === listing.sellerId;
  const canPurchase = currentUser !== undefined && !isSeller && listing.status === "PUBLISHED";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <GlassPanel className="p-6">
        {listing.images.length > 0 && (
          <div className="mb-5 overflow-hidden rounded-[24px] bg-white">
            {/* 商品画像はブラウザが storage を直接読む公開アセット */}
            <img
              alt={listing.title}
              className="aspect-square w-full object-contain"
              src={listing.images[0].url}
            />
            {listing.images.length > 1 && (
              <div className="flex gap-2 p-2">
                {listing.images.map((image) => (
                  <img
                    alt=""
                    className="size-16 rounded-lg object-cover"
                    key={image.sortOrder}
                    loading="lazy"
                    src={image.url}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge tone={listing.status === "PUBLISHED" ? "good" : "neutral"}>{listing.status}</StatusBadge>
          <StatusBadge tone={listing.signatureId === undefined ? "warn" : "good"}>
            {listing.signatureId === undefined ? "Unsigned" : "Human-signed"}
          </StatusBadge>
        </div>
        <h2 className="text-3xl font-semibold text-neutral-950">{listing.title}</h2>
        <p className="mt-4 text-sm leading-7 text-neutral-600">{listing.description}</p>
        <div className="mt-8 rounded-[24px] bg-white/72 p-4">
          <dl>
            <DetailRow label="Price" value={`${listing.price.toLocaleString("ja-JP")} ${listing.currency}`} />
            <DetailRow label="Category" value={listing.category} />
            <DetailRow label="Condition" value={listing.condition} />
            <DetailRow label="Seller" value={listing.sellerId} />
          </dl>
        </div>
      </GlassPanel>

      <div className="space-y-4">
        <GlassPanel className="p-5">
          <h3 className="text-base font-semibold text-neutral-950">Actions</h3>
          {currentUser === undefined && (
            <div className="mt-4">
              <ActionButton href="/api/auth/signin" variant="primary">
                Sign in to buy
              </ActionButton>
            </div>
          )}
          {isSeller && (
            <div className="mt-4 space-y-3">
              {listing.status === "DRAFT" && <PublishListingButton listing={listing} />}
            </div>
          )}
          {canPurchase && (
            <div className="mt-4 space-y-3">
              <form action={purchaseListingAction}>
                <input name="listingId" type="hidden" value={listing.listingId} />
                <ActionButton type="submit" variant="primary">
                  Buy with confirmation
                </ActionButton>
              </form>
              {currentUser.humanVerified && (
                <WorldcoinPayButton jpyPrice={listing.price} listingId={listing.listingId} />
              )}
            </div>
          )}
          {!canPurchase && currentUser !== undefined && !isSeller && (
            <p className="mt-3 text-sm leading-6 text-neutral-500">Not purchasable.</p>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
