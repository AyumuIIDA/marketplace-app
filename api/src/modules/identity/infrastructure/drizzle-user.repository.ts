import { and, eq } from "drizzle-orm";

import type { Db } from "../../../db/client.js";
import { authIdentities, users } from "../../../db/schema/index.js";
import { InfrastructureError } from "../../../shared/index.js";
import {
  User,
  type AuthIdentity,
  type AuthIdentityRepository,
  type AuthProvider,
  type CreateAuthIdentityInput,
  type UserRepository,
  type UserStatus,
} from "../domain/index.js";

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
        humanVerifiedAt: snapshot.humanVerifiedAt,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: snapshot.displayName,
          email: snapshot.email,
          avatarUrl: snapshot.avatarUrl,
          status: snapshot.status,
          humanVerifiedAt: snapshot.humanVerifiedAt,
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
    email: row.email ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    status: row.status as UserStatus,
    humanVerifiedAt: row.humanVerifiedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleAuthIdentityRepository implements AuthIdentityRepository {
  constructor(private readonly db: UserRepositoryDb) {}

  async save(input: CreateAuthIdentityInput): Promise<AuthIdentity> {
    const [row] = await this.db
      .insert(authIdentities)
      .values({
        id: input.id,
        userId: input.userId,
        provider: input.provider,
        providerSubject: input.providerSubject,
        createdAt: input.createdAt,
      })
      .onConflictDoUpdate({
        target: [authIdentities.provider, authIdentities.providerSubject],
        set: {
          userId: input.userId,
        },
      })
      .returning();

    if (row === undefined) {
      throw new InfrastructureError("Auth identity save returned no row.");
    }

    return rehydrateAuthIdentity(row);
  }

  async findByProviderSubject(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthIdentity | undefined> {
    const [row] = await this.db
      .select()
      .from(authIdentities)
      .where(
        and(eq(authIdentities.provider, provider), eq(authIdentities.providerSubject, providerSubject)),
      )
      .limit(1);

    if (row === undefined) {
      return undefined;
    }

    return rehydrateAuthIdentity(row);
  }
}

type AuthIdentityRow = typeof authIdentities.$inferSelect;

function rehydrateAuthIdentity(row: AuthIdentityRow): AuthIdentity {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider as AuthProvider,
    providerSubject: row.providerSubject,
    createdAt: row.createdAt,
  };
}
