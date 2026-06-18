import { Seal } from "../../../components/ui/seal";
import { toggleListingLikeAction } from "../../social/actions/social.actions";
import { LikeButton } from "../../social/components/like-button";
import type { ListingViewModel } from "../listing-view-model";
import { ProductVisual } from "./product-visual";

type ListingCardProps = {
  item: ListingViewModel;
  signedLabel: string;
  draftLabel: string;
  soldLabel: string;
  likeLabel: string;
};

export function ListingCard({ draftLabel, item, likeLabel, signedLabel, soldLabel }: ListingCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <a
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        href={`/listings/${item.id}`}
      >
        <div className="relative">
          <ProductVisual imageUrl={item.imageUrl} title={item.title} />
          {item.signed && (
            <span className="absolute left-2 top-2">
              <Seal label={signedLabel} size="sm" />
            </span>
          )}
          {item.status === "SOLD" && (
            <span className="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-semibold tracking-wide text-paper">
              {soldLabel}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">{item.category}</p>
            {item.status === "DRAFT" && (
              <span className="rounded-full bg-warn-tint px-1.5 py-0.5 text-[10px] font-semibold text-warn">
                {draftLabel}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{item.title}</h3>
          <p className="mt-auto pt-1.5 font-mono text-base font-semibold text-ink">¥{item.priceLabel}</p>
        </div>
      </a>

      {/* ハートはリンクの外に重ね、遷移と分離する。 */}
      <LikeButton
        ariaLabel={likeLabel}
        className="absolute right-2 top-2 z-10"
        toggleAction={toggleListingLikeAction.bind(null, item.id)}
      />
    </article>
  );
}
