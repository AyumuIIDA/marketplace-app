import { bffJson, isBffError } from "./bff-client";

export type Review = {
  reviewId: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  agentId?: string;
  rating: number;
  comment: string;
  status: "DRAFT" | "SUBMITTED" | "HIDDEN";
  signatureId?: string;
  createdAt: string;
  submittedAt?: string;
  hiddenAt?: string;
};

export async function listReviews(
  input: { orderId?: string; revieweeId?: string; reviewerId?: string; limit?: number } = {},
): Promise<Review[]> {
  const params = new URLSearchParams();

  if (input.orderId !== undefined) {
    params.set("orderId", input.orderId);
  }

  // revieweeId=受け取ったレビュー（出品者プロフィール用）、reviewerId=書いたレビュー。
  if (input.revieweeId !== undefined) {
    params.set("revieweeId", input.revieweeId);
  }

  if (input.reviewerId !== undefined) {
    params.set("reviewerId", input.reviewerId);
  }

  if (input.limit !== undefined) {
    params.set("limit", input.limit.toString());
  }

  try {
    const output = await bffJson<{ items: Review[] }>(
      `/reviews${params.size > 0 ? `?${params.toString()}` : ""}`,
    );

    return output.items;
  } catch (error) {
    if (isBffError(error) && error.status === 401) {
      return [];
    }

    throw error;
  }
}

export async function createReview(input: {
  orderId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  return bffJson<Review>("/reviews", {
    method: "POST",
    body: input,
  });
}

export async function submitReview(input: {
  reviewId: string;
  idKitResult: unknown;
  expectedEnvironment?: string;
}): Promise<Review> {
  return bffJson<Review>(`/reviews/${input.reviewId}/submit`, {
    method: "POST",
    body: {
      idKitResult: input.idKitResult,
      expectedEnvironment: input.expectedEnvironment,
    },
  });
}
