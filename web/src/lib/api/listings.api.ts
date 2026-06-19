import { bffJson, isBffError } from "./bff-client";

export type Listing = {
  listingId: string;
  sellerId: string;
  agentId?: string;
  title: string;
  description: string;
  price: number;
  currency: "JPY";
  category: string;
  condition: string;
  status: "DRAFT" | "PUBLISHED" | "SOLD" | "HIDDEN";
  signatureId?: string;
  likeCount: number;
  commentCount: number;
  images: { url: string; sortOrder: number }[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  soldAt?: string;
};

export async function searchListings(
  input: {
    keyword?: string;
    category?: string;
    sellerId?: string;
    limit?: number;
    offset?: number;
    // 並び順（shuffle/newest/popular/commented/priceAsc/priceDesc）。seed は shuffle の決定的シャッフル用。
    sort?: string;
    seed?: string;
    // signed=true で認証済みのみ。認証ファセットはサーバ側で全件に対し適用する。
    signed?: boolean;
  } = {},
): Promise<Listing[]> {
  const params = new URLSearchParams();
  const keyword = input.keyword?.trim();
  const category = input.category?.trim();
  const sellerId = input.sellerId?.trim();

  if (keyword !== undefined && keyword.length > 0) {
    params.set("keyword", keyword);
  }

  if (category !== undefined && category.length > 0) {
    params.set("category", category);
  }

  if (sellerId !== undefined && sellerId.length > 0) {
    params.set("sellerId", sellerId);
  }

  if (input.limit !== undefined) {
    params.set("limit", input.limit.toString());
  }

  if (input.offset !== undefined && input.offset > 0) {
    params.set("offset", input.offset.toString());
  }

  if (input.sort !== undefined && input.sort.length > 0) {
    params.set("sort", input.sort);
  }

  if (input.seed !== undefined && input.seed.length > 0) {
    params.set("seed", input.seed);
  }

  if (input.signed === true) {
    params.set("signed", "true");
  }

  try {
    const output = await bffJson<{ items: Listing[] }>(
      `/listings${params.size > 0 ? `?${params.toString()}` : ""}`,
    );

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function searchMyListings(input: { limit?: number } = {}): Promise<Listing[]> {
  const params = new URLSearchParams({ mine: "true" });

  if (input.limit !== undefined) {
    params.set("limit", input.limit.toString());
  }

  try {
    const output = await bffJson<{ items: Listing[] }>(`/listings?${params.toString()}`);

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export type ListingCategory = {
  category: string;
  count: number;
};

// 公開中の出品のカテゴリ別件数。取得窓に依存しないカテゴリ選択肢/ファセットの正本。
export async function getCategories(): Promise<ListingCategory[]> {
  try {
    const output = await bffJson<{ items: ListingCategory[] }>("/listings/categories");

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function getListing(listingId: string): Promise<Listing | undefined> {
  try {
    return await bffJson<Listing>(`/listings/${listingId}`);
  } catch (error) {
    // 401/404 に加え 403 も「閲覧不可」として undefined を返す。
    // 取引相手の SOLD 出品など、非公開/非所有の出品は読めず 403 になる（呼び出し側はフォールバック表示）。
    if (isBffError(error) && (error.status === 401 || error.status === 403 || error.status === 404)) {
      return undefined;
    }

    throw error;
  }
}

export async function createListing(input: {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images?: { url: string; hash: string; sortOrder: number }[];
}): Promise<Listing> {
  return bffJson<Listing>("/listings", {
    method: "POST",
    body: {
      ...input,
      currency: "JPY",
    },
  });
}

export type PurchaseListingOutput =
  | {
      status: "REQUIRES_CONFIRMATION";
      listingId: string;
    }
  | {
      status: "PAID";
      order: {
        orderId: string;
      };
    };

export async function purchaseListing(listingId: string): Promise<PurchaseListingOutput> {
  return bffJson<PurchaseListingOutput>(`/listings/${listingId}/purchase`, {
    method: "POST",
    body: {
      confirmed: true,
    },
  });
}

// World ID署名なしの公開（login のみ）。idKitResult を送らない＝通常公開。
export async function publishUnsignedListing(listingId: string): Promise<{
  listingId: string;
  status: "PUBLISHED";
}> {
  return bffJson<{ listingId: string; status: "PUBLISHED" }>(`/listings/${listingId}/publish`, {
    method: "POST",
    body: {},
  });
}

export async function publishListing(input: {
  listingId: string;
  idKitResult: unknown;
  expectedEnvironment?: string;
}): Promise<{
  listingId: string;
  signatureId: string;
  status: "PUBLISHED";
}> {
  return bffJson<{
    listingId: string;
    signatureId: string;
    status: "PUBLISHED";
  }>(`/listings/${input.listingId}/publish`, {
    method: "POST",
    body: {
      idKitResult: input.idKitResult,
      expectedEnvironment: input.expectedEnvironment,
    },
  });
}
