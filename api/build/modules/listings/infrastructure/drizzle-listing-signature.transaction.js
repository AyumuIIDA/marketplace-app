import { DrizzleHumanSignatureRepository, DrizzleWorldIdVerificationRepository, } from "../../signatures/infrastructure/index.js";
import { DrizzleListingRepository } from "./drizzle-listing.repository.js";
export class DrizzleListingSignatureTransaction {
    db;
    constructor(db) {
        this.db = db;
    }
    async run(operation) {
        return this.db.transaction((tx) => operation({
            listingRepository: new DrizzleListingRepository(tx),
            humanSignatureRepository: new DrizzleHumanSignatureRepository(tx),
            worldIdVerificationRepository: new DrizzleWorldIdVerificationRepository(tx),
        }));
    }
}
