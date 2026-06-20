import { getTranslations } from "next-intl/server";

import { Seal } from "../../../components/ui/seal";
import type { Review } from "../../../lib/api/reviews.api";
import { StarRating } from "../../social/components/star-rating";

// 出品者が受け取ったレビュー一覧。提出済みレビューは World ID 署名付き＝認証済みの取引相手による評価。
// 評価者の実名は出さず「認証済みの取引相手」とし、Seal で人間裏付けを示す（プライバシー＋ブランド整合）。
export async function SellerReviews({ reviews }: { reviews: Review[] }) {
  const t = await getTranslations("sellerProfile");

  if (reviews.length === 0) {
    return <p className="text-sm text-ink-soft">{t("reviewsEmpty")}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {reviews.map((review) => {
        const when = review.submittedAt ?? review.createdAt;
        return (
          <li className="py-4 first:pt-0" key={review.reviewId}>
            <div className="flex items-center gap-2">
              <StarRating value={review.rating} />
              <span className="font-mono text-xs text-ink-soft">{review.rating}/5</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-faint">
                <Seal size="2xs" variant="badge" />
                {t("verifiedBuyer")}
              </span>
            </div>
            {review.comment.trim().length > 0 && (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink">{review.comment}</p>
            )}
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              {new Date(when).toLocaleDateString("ja-JP")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
