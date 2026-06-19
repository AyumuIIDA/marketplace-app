import { getTranslations } from "next-intl/server";

import { ActionButton } from "../../../components/ui/action-button";
import { Avatar } from "../../../components/ui/avatar";
import { BackLink } from "../../../components/ui/back-link";
import { Seal } from "../../../components/ui/seal";
import { StatePanel } from "../../../components/ui/state-panel";
import type { CurrentUser } from "../../../lib/api/current-user.api";
import type { Listing } from "../../../lib/api/listings.api";
import { getSellerSummary } from "../../../lib/api/sellers.api";
import { listListingComments } from "../../../lib/api/social.api";
import { createListingCommentAction, toggleListingLikeAction, toggleSellerLikeAction } from "../../social/actions/social.actions";
import { CommentThread } from "../../social/components/comment-thread";
import { LikeButton } from "../../social/components/like-button";
import { StarRating } from "../../social/components/star-rating";
import { publishListingAction } from "../actions/listing.actions";
import { ProductGallery } from "./product-gallery";

type ListingDetailViewProps = {
  currentUser: CurrentUser | undefined;
  listing: Listing | undefined;
  initialLiked?: boolean;
};

export async function ListingDetailView({ currentUser, initialLiked = false, listing }: ListingDetailViewProps) {
  const [t, social] = await Promise.all([getTranslations("listing"), getTranslations("social")]);

  if (listing === undefined) {
    return <StatePanel actionHref="/" actionLabel={t("backAction")} title={t("unavailableTitle")} />;
  }

  const isSeller = currentUser?.userId === listing.sellerId;
  const isSold = listing.status === "SOLD";
  const canPurchase = currentUser !== undefined && !isSeller && listing.status === "PUBLISHED";
  // Seal の正本＝出品者アカウントの人間認証。行為署名(signatureId)ではなくアカウント認証で判断する（Route A）。
  const signed = listing.sellerVerified === true;
  const [seller, comments] = await Promise.all([
    getSellerSummary(listing.sellerId),
    listListingComments(listing.listingId),
  ]);
  // コメント投稿は本人認証済みのログインユーザーのみ。
  const canComment = currentUser !== undefined && currentUser.humanVerified;
  const commentDisabledReason =
    currentUser === undefined ? "コメントするにはログインが必要です。" : "コメントするには本人認証が必要です。";

  // 非出品者の購入導線。PCインラインとモバイル固定バーで同じ分岐を共有する。
  const buy = isSold
    ? { disabled: true, label: t("soldOut"), variant: "secondary" as const }
    : currentUser === undefined
      ? { href: "/signin", label: t("signInToBuy"), variant: "primary" as const }
      : canPurchase
        ? { href: `/listings/${listing.listingId}/purchase`, label: t("buyConfirm"), variant: "primary" as const }
        : { disabled: true, label: t("notPurchasable"), variant: "secondary" as const };

  return (
    <div className={`mx-auto max-w-[1080px] md:pb-0 ${isSeller ? "" : "pb-32"}`}>
      <div className="mb-4">
        <BackLink href="/" label={t("backAction")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start lg:gap-10">
        {/* 左ペイン: 画像ギャラリー。PCではスクロール追従。 */}
        <div className="lg:sticky lg:top-20">
          <ProductGallery
            images={listing.images}
            signed={signed}
            signedLabel={t("signed")}
            soldLabel={isSold ? t("soldOut") : undefined}
            title={listing.title}
          />
        </div>

        {/* 右ペイン: 出品者・取引・署名・説明。商品情報カラム。 */}
        <div className="space-y-6">
          {/* 出品者。タップで出品者ページへ。右端はフォロー相当の出品者いいね。 */}
          <div className="flex items-center gap-3">
            <a className="group flex min-w-0 flex-1 items-center gap-3" href={`/sellers/${seller.sellerId}`}>
              <Avatar alt="" className="size-10" seed={seller.displayName || seller.handle} src={seller.avatarUrl} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-ink group-hover:underline">
                    {seller.displayName}
                  </span>
                  {seller.humanVerified && <Seal label={social("verifiedSeller")} size="sm" />}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                  <span className="truncate font-mono">{seller.handle}</span>
                  {seller.rating !== undefined && (
                    <>
                      <span aria-hidden>·</span>
                      <StarRating className="[&_svg]:size-3" value={seller.rating} />
                      <span className="font-mono text-ink-soft">{seller.rating.toFixed(1)}</span>
                    </>
                  )}
                </div>
              </div>
            </a>
            <LikeButton
              ariaLabel={social("likeSeller")}
              className="shrink-0"
              initialCount={seller.likeCount}
              initialLiked={seller.likedByMe}
              showCount
              text={{ like: social("likeSeller"), liked: social("likedSeller") }}
              toggleAction={toggleSellerLikeAction.bind(null, seller.sellerId)}
            />
          </div>

          {/* タイトルと価格。価格は ZOZO 同様に大きく主役化。 */}
          <div className="border-t border-line pt-5">
            <h1 className="text-xl font-bold leading-snug tracking-tight text-ink">{listing.title}</h1>
            <p className="mt-2 font-mono text-3xl font-semibold text-ink">¥{listing.price.toLocaleString("ja-JP")}</p>
          </div>

          {/* 署名＝ブランドの核。朱の印を帯として商品に押す。 */}
          <div
            className={`flex items-start gap-3 rounded-md border px-3.5 py-3 ${
              signed ? "border-seal/30 bg-seal-tint" : "border-line bg-paper"
            }`}
          >
            <Seal size="sm" tone="light" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{signed ? t("signedTitle") : t("unsignedTitle")}</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                {signed ? t("signedExplain") : t("unsignedExplain")}
              </p>
            </div>
          </div>

          {/* 取引。出品者本人は公開操作、それ以外は購入導線（PCインライン）。 */}
          {isSeller ? (
            listing.status === "DRAFT" ? (
              // 公開はログインのみ。認証済みアカウントの出品は自動で認証マーク(Seal)が付く（Route A: アカウント認証を継承）。
              <form action={publishListingAction} className="space-y-1.5">
                <input name="listingId" type="hidden" value={listing.listingId} />
                <ActionButton className="w-full" type="submit" variant="primary">
                  {t("publish")}
                </ActionButton>
                <p className="text-xs leading-5 text-ink-soft">{t("publishHint")}</p>
              </form>
            ) : null
          ) : (
            <div className="hidden space-y-1.5 md:block">
              <ActionButton className="w-full" disabled={buy.disabled} href={buy.href} variant={buy.variant}>
                {buy.label}
              </ActionButton>
              {canPurchase && <p className="text-xs leading-5 text-ink-soft">{t("buyConfirmHint")}</p>}
            </div>
          )}

          {/* いいね＋コメント導線。ZOZOのお気に入り相当をここに置く。 */}
          <div className="flex items-center gap-1 border-t border-line pt-4">
            <LikeButton
              ariaLabel={social("likeItem")}
              initialCount={listing.likeCount}
              initialLiked={initialLiked}
              showCount
              toggleAction={toggleListingLikeAction.bind(null, listing.listingId)}
            />
            <a
              aria-label="コメントへ"
              className="inline-flex items-center gap-1.5 rounded-full p-2 text-ink-soft transition-colors hover:text-ink"
              href="#comments"
            >
              <svg aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5Z" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-xs">{listing.commentCount}</span>
            </a>
          </div>

          {/* 説明。 */}
          <div className="border-t border-line pt-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">{t("descriptionLabel")}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink">{listing.description}</p>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">{t("category")}</dt>
                <dd className="text-ink">{listing.category}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">{t("condition")}</dt>
                <dd className="text-ink">{listing.condition}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* コメント。2ペインの下に全幅で配置し、スレッドに横幅を与える。 */}
      <section className="mt-10 border-t border-line pt-6" id="comments">
        <CommentThread
          canComment={canComment}
          commentAction={createListingCommentAction.bind(null, listing.listingId)}
          disabledReason={commentDisabledReason}
          initialComments={comments}
        />
      </section>

      {/* モバイル取引バー。PCは右パネルにインライン表示するため隠す。下部ナビの上に固定。 */}
      {!isSeller && (
        <div className="fixed inset-x-0 bottom-[57px] z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-[1080px] items-center gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">{t("priceLabel")}</p>
              <p className="truncate font-mono text-lg font-semibold text-ink">
                ¥{listing.price.toLocaleString("ja-JP")}
              </p>
            </div>
            <ActionButton className="ml-auto shrink-0" disabled={buy.disabled} href={buy.href} variant={buy.variant}>
              {buy.label}
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
