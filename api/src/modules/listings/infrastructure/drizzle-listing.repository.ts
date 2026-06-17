import { and, asc, eq, gte, ilike, inArray, lte, ne, or } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { listingImages, listings } from "../../../db/schema/index.js";
import {
  Listing,
  type ClaimListingForPurchaseInput,
  type ListingImageRef,
  type ListingRepository,
  type ListingStatus,
  type SaveListingImagesInput,
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

  // listing_images へ画像行を追記する（出品作成時の添付）。空配列はno-op。
  async saveImages(input: SaveListingImagesInput): Promise<void> {
    if (input.images.length === 0) {
      return;
    }

    await this.db.insert(listingImages).values(
      input.images.map((image) => ({
        listingId: input.listingId,
        url: image.url,
        imageHash: image.hash,
        sortOrder: image.sortOrder,
      })),
    );
  }

  // listing_images を listingId ごとに sort_order 順でロード（読み取り表示用）。
  private async loadImages(ids: string[]): Promise<Map<string, ListingImageRef[]>> {
    const map = new Map<string, ListingImageRef[]>();

    if (ids.length === 0) {
      return map;
    }

    const rows = await this.db
      .select()
      .from(listingImages)
      .where(inArray(listingImages.listingId, ids))
      .orderBy(asc(listingImages.sortOrder));

    for (const row of rows) {
      const list = map.get(row.listingId) ?? [];
      list.push({ url: row.url, sortOrder: row.sortOrder });
      map.set(row.listingId, list);
    }

    return map;
  }

  async findById(listingId: string): Promise<Listing | undefined> {
    try {
      const [row] = await this.db.select().from(listings).where(eq(listings.id, listingId)).limit(1);

      if (row === undefined) {
        return undefined;
      }

      const images = (await this.loadImages([row.id])).get(row.id) ?? [];

      return rehydrateListing(row, images);
    } catch (error: unknown) {
      // uuidカラムへ非uuid文字列が渡るとPostgresが 22P02 を投げる。
      // 「存在しないid」と同義として undefined を返し、usecaseの NotFound→404 へ集約する。
      if (isInvalidUuid(error)) {
        return undefined;
      }

      throw error;
    }
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

    const imageMap = await this.loadImages(rows.map((row) => row.id));

    return rows.map((row) => rehydrateListing(row, imageMap.get(row.id) ?? []));
  }
}

// Postgres invalid_text_representation。uuidカラムへ非uuid文字列を渡したときに発生する。
function isInvalidUuid(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (error as Record<string, unknown>).code === "22P02";
}

type ListingRow = typeof listings.$inferSelect;

function rehydrateListing(row: ListingRow, images: ListingImageRef[] = []): Listing {
  return Listing.rehydrate({
      images,
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
