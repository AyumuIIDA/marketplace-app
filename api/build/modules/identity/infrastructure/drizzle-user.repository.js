import { eq } from "drizzle-orm";
import { users } from "../../../db/schema/index.js";
import { User } from "../domain/index.js";
export class DrizzleUserRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(user) {
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
    async findById(userId) {
        const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (row === undefined) {
            return undefined;
        }
        return rehydrateUser(row);
    }
    async findByEmail(email) {
        const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
        if (row === undefined) {
            return undefined;
        }
        return rehydrateUser(row);
    }
}
function rehydrateUser(row) {
    return User.rehydrate({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        avatarUrl: row.avatarUrl ?? undefined,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}
