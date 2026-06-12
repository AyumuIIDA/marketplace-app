import { and, asc, eq, gte, ilike, lte, ne, or } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { listings } from "../../../db/schema/index.js";
import {
  Listing,
  type ClaimListingForPurchaseInput,
  type ListingRepository,
  type ListingStatus,
  type SearchListingsInput,
} from "../domain/index.js";

export type ListingRepositoryDb = Pick<Db, "insert" | "select" | "update">;

export class DrizzleListingRepository implements ListingRepository {
  constructor(private readonly db: ListingRepositoryDb) {}

  async save(listing: Listing): Promise<void> {
    const snapshot = listing.snapshot;

    await this.db
      .insert(listings)
      .values({
        id: snapshot.id,
        sellerId: snapshot.sellerId,
        agentId: snapshot.agentId,
        title: snapshot.title,
        description: snapshot.description,
        price: snapshot.price,
        currency: snapshot.currency,
        category: snapshot.category,
        condition: snapshot.condition,
        status: snapshot.status,
        signatureId: snapshot.signatureId,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        publishedAt: snapshot.publishedAt,
        soldAt: snapshot.soldAt,
      })
      .onConflictDoUpdate({
        target: listings.id,
        set: {
          title: snapshot.title,
          description: snapshot.description,
          price: snapshot.price,
          currency: snapshot.currency,
          category: snapshot.category,
          condition: snapshot.condition,
          status: snapshot.status,
          signatureId: snapshot.signatureId,
          updatedAt: snapshot.updatedAt,
          publishedAt: snapshot.publishedAt,
          soldAt: snapshot.soldAt,
        },
      });
  }

  async findById(listingId: string): Promise<Listing | undefined> {
    const [row] = await this.db.select().from(listings).where(eq(listings.id, listingId)).limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateListing(row);
  }

  async claimForPurchase(input: ClaimListingForPurchaseInput): Promise<Listing | undefined> {
    const [row] = await this.db
      .update(listings)
      .set({
        status: "SOLD",
        soldAt: input.soldAt,
        updatedAt: input.soldAt,
      })
      .where(
        and(
          eq(listings.id, input.listingId),
          eq(listings.status, "PUBLISHED"),
          ne(listings.sellerId, input.buyerId),
        ),
      )
      .returning();

    if (row === undefined) {
      return undefined;
    }

    return rehydrateListing(row);
  }

  async search(input: SearchListingsInput): Promise<Listing[]> {
    const conditions = [
      input.status === undefined ? undefined : eq(listings.status, input.status),
      input.sellerId === undefined ? undefined : eq(listings.sellerId, input.sellerId),
      input.category === undefined ? undefined : eq(listings.category, input.category),
      input.condition === undefined ? undefined : eq(listings.condition, input.condition),
      input.minPrice === undefined ? undefined : gte(listings.price, input.minPrice),
      input.maxPrice === undefined ? undefined : lte(listings.price, input.maxPrice),
      input.keyword === undefined
        ? undefined
        : or(
            ilike(listings.title, `%${input.keyword}%`),
            ilike(listings.description, `%${input.keyword}%`),
          ),
    ].filter((condition) => condition !== undefined);
    const rows = await this.db
      .select()
      .from(listings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(listings.createdAt))
      .limit(input.limit ?? 50);

    return rows.map(rehydrateListing);
  }
}

type ListingRow = typeof listings.$inferSelect;

function rehydrateListing(row: ListingRow): Listing {
  return Listing.rehydrate({
      id: row.id,
      sellerId: row.sellerId,
      agentId: row.agentId ?? undefined,
      title: row.title,
      description: row.description,
      price: row.price,
      currency: row.currency as "JPY",
      category: row.category,
      condition: row.condition,
      status: row.status as ListingStatus,
      signatureId: row.signatureId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt ?? undefined,
      soldAt: row.soldAt ?? undefined,
  });
}
