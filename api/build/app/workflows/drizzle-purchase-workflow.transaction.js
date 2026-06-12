import { DrizzleListingRepository, } from "../../modules/listings/infrastructure/index.js";
import { DrizzleOrderRepository, } from "../../modules/orders/infrastructure/index.js";
export class DrizzlePurchaseWorkflowTransaction {
    db;
    constructor(db) {
        this.db = db;
    }
    async run(operation) {
        return this.db.transaction((tx) => operation({
            listingRepository: new DrizzleListingRepository(tx),
            orderRepository: new DrizzleOrderRepository(tx),
        }));
    }
}
