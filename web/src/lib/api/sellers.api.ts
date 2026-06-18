// 出品者サマリ。出品者UI（名前・本人確認・評価・いいね）の表示元。
// TODO(backend): GET /sellers/:id を実装したら fetch に差し替える。
// 契約は prj_context/social-features-backend-iayu6.md を参照。
export type SellerSummary = {
  sellerId: string;
  handle: string;
  humanVerified: boolean;
  rating?: number;
  reviewCount: number;
  likeCount: number;
  likedByMe: boolean;
};

export async function getSellerSummary(
  sellerId: string,
  hints: { humanVerified?: boolean } = {},
): Promise<SellerSummary> {
  // 暫定値（backend未実装）。UIの形は確定させ、データ供給のみ後で差し替える。
  return {
    sellerId,
    handle: `@${sellerId.slice(0, 8)}`,
    humanVerified: hints.humanVerified ?? false,
    rating: undefined,
    reviewCount: 0,
    likeCount: 0,
    likedByMe: false,
  };
}
