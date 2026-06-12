import { and, asc, eq, or } from "drizzle-orm";
import { orders } from "../../../db/schema/index.js";
import { AppError } from "../../../shared/index.js";
import { Order, } from "../domain/index.js";
export class DrizzleOrderRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(order) {
        const snapshot = order.snapshot;
        try {
            await this.db
                .insert(orders)
                .values({
                id: snapshot.id,
                listingId: snapshot.listingId,
                buyerId: snapshot.buyerId,
                sellerId: snapshot.sellerId,
                status: snapshot.status,
                price: snapshot.price,
                currency: snapshot.currency,
                createdAt: snapshot.createdAt,
                paidAt: snapshot.paidAt,
                shippedAt: snapshot.shippedAt,
                receivedAt: snapshot.receivedAt,
                completedAt: snapshot.completedAt,
                canceledAt: snapshot.canceledAt,
            })
                .onConflictDoUpdate({
                target: orders.id,
                set: {
                    status: snapshot.status,
                    shippedAt: snapshot.shippedAt,
                    receivedAt: snapshot.receivedAt,
                    completedAt: snapshot.completedAt,
                    canceledAt: snapshot.canceledAt,
                },
            });
        }
        catch (error) {
            throw toOrderPersistenceError(error, snapshot.listingId);
        }
    }
    async findById(orderId) {
        const [row] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (row === undefined) {
            return undefined;
        }
        return rehydrateOrder(row);
    }
    async findByListingId(listingId) {
        const [row] = await this.db.select().from(orders).where(eq(orders.listingId, listingId)).limit(1);
        if (row === undefined) {
            return undefined;
        }
        return rehydrateOrder(row);
    }
    async search(input) {
        const conditions = [
            input.participantId === undefined
                ? undefined
                : or(eq(orders.buyerId, input.participantId), eq(orders.sellerId, input.participantId)),
            input.buyerId === undefined ? undefined : eq(orders.buyerId, input.buyerId),
            input.sellerId === undefined ? undefined : eq(orders.sellerId, input.sellerId),
            input.status === undefined ? undefined : eq(orders.status, input.status),
        ].filter((condition) => condition !== undefined);
        const rows = await this.db
            .select()
            .from(orders)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(orders.createdAt))
            .limit(input.limit ?? 50);
        return rows.map(rehydrateOrder);
    }
}
export function toOrderPersistenceError(error, listingId) {
    if (isUniqueViolation(error, "orders_listing_id_uidx")) {
        return new AppError("LISTING_ALREADY_ORDERED", "This listing already has an order.", 409, {
            listingId,
        });
    }
    return error;
}
function isUniqueViolation(error, constraint) {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const value = error;
    return value.code === "23505" && value.constraint === constraint;
}
function rehydrateOrder(row) {
    return Order.rehydrate({
        id: row.id,
        listingId: row.listingId,
        buyerId: row.buyerId,
        sellerId: row.sellerId,
        status: row.status,
        price: row.price,
        currency: row.currency,
        createdAt: row.createdAt,
        paidAt: row.paidAt ?? undefined,
        shippedAt: row.shippedAt ?? undefined,
        receivedAt: row.receivedAt ?? undefined,
        completedAt: row.completedAt ?? undefined,
        canceledAt: row.canceledAt ?? undefined,
    });
}
