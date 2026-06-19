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
  // 非PUBLISHED出品のリンク無効化(blockUnviewable)時の HIDDEN バッジ文言。無効化しない呼び出しでは不要。
  unavailableLabel?: string;
  // 非PUBLISHED（非出品者には403で開けない）の出品の遷移リンクを無効化する。いいねタブ専用。
  blockUnviewable?: boolean;
};

export function ListingCard({
  blockUnviewable = false,
  draftLabel,
  item,
  likeLabel,
  signedLabel,
  soldLabel,
  unavailableLabel,
}: ListingCardProps) {
  // 非出品者は非PUBLISHEDの詳細を開けない（403）。該当時はリンクを無効化し、誤遷移を防ぐ。
  const blocked = blockUnviewable && item.status !== "PUBLISHED";
  const href = `/listings/${item.id}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow hover:shadow-md">
      <CardLink blocked={blocked} className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30" href={href}>
        <div className="relative">
          <ProductVisual imageUrl={item.imageUrl} title={item.title} />
          {item.sellerVerified && (
            <span className="absolute left-2 top-2">
              <Seal label={signedLabel} size="sm" />
            </span>
          )}
          {item.status === "SOLD" && (
            <span className="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-semibold tracking-wide text-paper">
              {soldLabel}
            </span>
          )}
          {blocked && item.status === "HIDDEN" && (
            <span className="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-semibold tracking-wide text-paper">
              {unavailableLabel}
            </span>
          )}
        </div>
      </CardLink>

      {/* Instagram風アクションバー: いいね（数）＋コメント数。リンク遷移と分離する。 */}
      <div className="flex items-center gap-3 px-3 pt-2.5">
        <LikeButton
          ariaLabel={likeLabel}
          initialCount={item.likeCount}
          initialLiked={item.liked}
          showCount
          toggleAction={toggleListingLikeAction.bind(null, item.id)}
        />
        <CardLink
          ariaLabel="comments"
          blocked={blocked}
          className="inline-flex items-center gap-1 rounded-full p-2 text-ink-soft transition-colors hover:text-ink"
          href={href}
        >
          <svg aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5Z" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-xs">{item.commentCount}</span>
        </CardLink>
      </div>

      <CardLink blocked={blocked} className="flex flex-1 flex-col focus-visible:outline-none" href={href}>
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
      </CardLink>
    </article>
  );
}

// blocked=true のときはリンク遷移を無効化（403ページへ飛ばさない）。それ以外は通常の <a>。
function CardLink({
  ariaLabel,
  blocked,
  children,
  className,
  href,
}: {
  ariaLabel?: string;
  blocked: boolean;
  children: React.ReactNode;
  className: string;
  href: string;
}) {
  if (blocked) {
    return (
      <div aria-label={ariaLabel} className={`${className} cursor-default`}>
        {children}
      </div>
    );
  }

  return (
    <a aria-label={ariaLabel} className={className} href={href}>
      {children}
    </a>
  );
}
