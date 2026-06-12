import { DrizzleListingRepository, } from "../../modules/listings/infrastructure/index.js";
import { DrizzleHumanSignatureRepository, DrizzleWorldIdVerificationRepository, } from "../../modules/signatures/infrastructure/index.js";
export class DrizzleHumanSignatureWorkflowTransaction {
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
