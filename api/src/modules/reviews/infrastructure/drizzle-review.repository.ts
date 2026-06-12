import { and, asc, eq } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { reviews } from "../../../db/schema/index.js";
import {
  Review,
  type ReviewRepository,
  type ReviewStatus,
  type SearchReviewsInput,
} from "../domain/index.js";

export type ReviewRepositoryDb = Pick<Db, "insert" | "select">;

export class DrizzleReviewRepository implements ReviewRepository {
  constructor(private readonly db: ReviewRepositoryDb) {}

  async save(review: Review): Promise<void> {
    const snapshot = review.snapshot;

    await this.db
      .insert(reviews)
      .values({
        id: snapshot.id,
        orderId: snapshot.orderId,
        reviewerId: snapshot.reviewerId,
        revieweeId: snapshot.revieweeId,
        agentId: snapshot.agentId,
        rating: snapshot.rating,
        comment: snapshot.comment,
        status: snapshot.status,
        signatureId: snapshot.signatureId,
        createdAt: snapshot.createdAt,
        submittedAt: snapshot.submittedAt,
        hiddenAt: snapshot.hiddenAt,
      })
      .onConflictDoUpdate({
        target: reviews.id,
        set: {
          rating: snapshot.rating,
          comment: snapshot.comment,
          status: snapshot.status,
          signatureId: snapshot.signatureId,
          submittedAt: snapshot.submittedAt,
          hiddenAt: snapshot.hiddenAt,
        },
      });
  }

  async findById(reviewId: string): Promise<Review | undefined> {
    const [row] = await this.db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateReview(row);
  }

  async findSubmittedByOrderReviewer(
    orderId: string,
    reviewerId: string,
  ): Promise<Review | undefined> {
    const [row] = await this.db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.orderId, orderId),
          eq(reviews.reviewerId, reviewerId),
          eq(reviews.status, "SUBMITTED"),
        ),
      )
      .limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateReview(row);
  }

  async search(input: SearchReviewsInput): Promise<Review[]> {
    const conditions = [
      input.orderId === undefined ? undefined : eq(reviews.orderId, input.orderId),
      input.reviewerId === undefined ? undefined : eq(reviews.reviewerId, input.reviewerId),
      input.revieweeId === undefined ? undefined : eq(reviews.revieweeId, input.revieweeId),
      input.status === undefined ? undefined : eq(reviews.status, input.status),
    ].filter((condition) => condition !== undefined);
    const rows = await this.db
      .select()
      .from(reviews)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(reviews.createdAt))
      .limit(input.limit ?? 50);

    return rows.map(rehydrateReview);
  }
}

type ReviewRow = typeof reviews.$inferSelect;

function rehydrateReview(row: ReviewRow): Review {
  return Review.rehydrate({
    id: row.id,
    orderId: row.orderId,
    reviewerId: row.reviewerId,
    revieweeId: row.revieweeId,
    agentId: row.agentId ?? undefined,
    rating: row.rating,
    comment: row.comment,
    status: row.status as ReviewStatus,
    signatureId: row.signatureId ?? undefined,
    createdAt: row.createdAt,
    submittedAt: row.submittedAt ?? undefined,
    hiddenAt: row.hiddenAt ?? undefined,
  });
}
