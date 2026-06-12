import { DrizzleHumanSignatureRepository, DrizzleWorldIdVerificationRepository, } from "./drizzle-signature.repository.js";
export class DrizzleHumanSignatureTransaction {
    db;
    constructor(db) {
        this.db = db;
    }
    async run(operation) {
        return this.db.transaction((tx) => operation({
            humanSignatureRepository: new DrizzleHumanSignatureRepository(tx),
            worldIdVerificationRepository: new DrizzleWorldIdVerificationRepository(tx),
        }));
    }
}
