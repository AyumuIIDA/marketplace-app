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
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <a
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
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
      </a>

      {/* Instagram風アクションバー: いいね（数）＋コメント数。リンク遷移と分離する。 */}
      <div className="flex items-center gap-3 px-3 pt-2.5">
        <LikeButton
          ariaLabel={likeLabel}
          initialCount={item.likeCount}
          initialLiked={item.liked}
          showCount
          toggleAction={toggleListingLikeAction.bind(null, item.id)}
        />
        <a
          aria-label="comments"
          className="inline-flex items-center gap-1 rounded-full p-2 text-ink-soft transition-colors hover:text-ink"
          href={`/listings/${item.id}`}
        >
          <svg aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5Z" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-xs">{item.commentCount}</span>
        </a>
      </div>

      <a className="flex flex-1 flex-col focus-visible:outline-none" href={`/listings/${item.id}`}>
        <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-1.5">
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
    </article>
  );
}
