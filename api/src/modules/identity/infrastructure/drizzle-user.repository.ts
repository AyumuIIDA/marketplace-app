import { eq } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { users } from "../../../db/schema/index.js";
import { User, type UserRepository, type UserStatus } from "../domain/index.js";

export type UserRepositoryDb = Pick<Db, "insert" | "select">;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: UserRepositoryDb) {}

  async save(user: User): Promise<void> {
    const snapshot = user.snapshot;

    await this.db
      .insert(users)
      .values({
        id: snapshot.id,
        displayName: snapshot.displayName,
        email: snapshot.email,
        avatarUrl: snapshot.avatarUrl,
        status: snapshot.status,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: snapshot.displayName,
          avatarUrl: snapshot.avatarUrl,
          status: snapshot.status,
          updatedAt: snapshot.updatedAt,
        },
      });
  }

  async findById(userId: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateUser(row);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateUser(row);
  }
}

type UserRow = typeof users.$inferSelect;

function rehydrateUser(row: UserRow): User {
  return User.rehydrate({
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    avatarUrl: row.avatarUrl ?? undefined,
    status: row.status as UserStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
