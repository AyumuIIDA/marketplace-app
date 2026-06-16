import { describe, expect, it } from "vitest";

import { DrizzleListingRepository, type ListingRepositoryDb } from "./drizzle-listing.repository.js";

// findById は db の select チェーンのみ使う。limit(1) の解決値を差し替えるфейクで分岐を検証する。
function fakeDbThatRejectsSelectWith(error: unknown): ListingRepositoryDb {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.reject(error),
        }),
      }),
    }),
  } as unknown as ListingRepositoryDb;
}

describe("DrizzleListingRepository.findById", () => {
  it("should return undefined when the id is not a valid uuid (Postgres 22P02)", async () => {
    const repository = new DrizzleListingRepository(fakeDbThatRejectsSelectWith({ code: "22P02" }));

    await expect(repository.findById("camera-kit")).resolves.toBeUndefined();
  });

  it("should rethrow unrelated database errors", async () => {
    const databaseError = { code: "23503" };
    const repository = new DrizzleListingRepository(fakeDbThatRejectsSelectWith(databaseError));

    await expect(repository.findById("camera-kit")).rejects.toBe(databaseError);
  });
});
