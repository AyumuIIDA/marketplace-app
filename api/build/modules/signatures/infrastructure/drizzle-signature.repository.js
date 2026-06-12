import { and, count, eq } from "drizzle-orm";
import { humanSignatures, worldIdVerifications } from "../../../db/schema/index.js";
import { HumanSignature, } from "../domain/index.js";
export class DrizzleHumanSignatureRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(signature) {
        const snapshot = signature.snapshot;
        await this.db
            .insert(humanSignatures)
            .values({
            id: snapshot.id,
            userId: snapshot.userId,
            actionType: snapshot.actionType,
            resourceType: snapshot.resourceType,
            resourceId: snapshot.resourceId,
            payloadHash: snapshot.payloadHash,
            signatureFormat: snapshot.signatureFormat,
            signatureValue: snapshot.signatureValue,
            worldIdVerificationId: snapshot.worldIdVerificationId,
            status: snapshot.status,
            signedAt: snapshot.signedAt,
            revokedAt: snapshot.revokedAt,
        })
            .onConflictDoUpdate({
            target: humanSignatures.id,
            set: {
                status: snapshot.status,
                revokedAt: snapshot.revokedAt,
            },
        });
    }
    async findValidByResourcePayload(input) {
        const [row] = await this.db
            .select()
            .from(humanSignatures)
            .where(and(eq(humanSignatures.actionType, input.actionType), eq(humanSignatures.resourceType, input.resourceType), eq(humanSignatures.resourceId, input.resourceId), eq(humanSignatures.payloadHash, input.payloadHash), eq(humanSignatures.status, "VALID")))
            .limit(1);
        if (row === undefined) {
            return undefined;
        }
        return HumanSignature.rehydrate({
            id: row.id,
            userId: row.userId,
            actionType: row.actionType,
            resourceType: row.resourceType,
            resourceId: row.resourceId,
            payloadHash: row.payloadHash,
            signatureFormat: row.signatureFormat,
            signatureValue: row.signatureValue,
            worldIdVerificationId: row.worldIdVerificationId,
            status: row.status,
            signedAt: row.signedAt,
            revokedAt: row.revokedAt ?? undefined,
        });
    }
}
export class DrizzleWorldIdVerificationRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async save(verification) {
        const snapshot = verification.snapshot;
        await this.db.insert(worldIdVerifications).values({
            id: snapshot.id,
            userId: snapshot.userId,
            action: snapshot.action,
            nullifierHash: snapshot.nullifierHash,
            verificationLevel: snapshot.verificationLevel,
            signalHash: snapshot.signalHash,
            environment: snapshot.environment,
            verifiedAt: snapshot.verifiedAt,
            createdAt: snapshot.createdAt,
        });
    }
    async countByUserAction(userId, action) {
        const [row] = await this.db
            .select({ value: count() })
            .from(worldIdVerifications)
            .where(and(eq(worldIdVerifications.userId, userId), eq(worldIdVerifications.action, action)));
        return row?.value ?? 0;
    }
}
