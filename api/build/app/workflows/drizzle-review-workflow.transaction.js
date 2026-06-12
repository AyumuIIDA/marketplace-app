import { DrizzleOrderRepository, } from "../../modules/orders/infrastructure/index.js";
import { DrizzleReviewRepository, } from "../../modules/reviews/infrastructure/index.js";
import { DrizzleHumanSignatureRepository, DrizzleWorldIdVerificationRepository, } from "../../modules/signatures/infrastructure/index.js";
export class DrizzleReviewWorkflowTransaction {
    db;
    constructor(db) {
        this.db = db;
    }
    async run(operation) {
        return this.db.transaction((tx) => operation({
            orderRepository: new DrizzleOrderRepository(tx),
            reviewRepository: new DrizzleReviewRepository(tx),
            humanSignatureRepository: new DrizzleHumanSignatureRepository(tx),
            worldIdVerificationRepository: new DrizzleWorldIdVerificationRepository(tx),
        }));
    }
}
