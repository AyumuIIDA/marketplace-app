import { DrizzleMessageRepository, } from "../../modules/messages/infrastructure/index.js";
import { DrizzleOrderRepository, } from "../../modules/orders/infrastructure/index.js";
export class DrizzleMessageWorkflowTransaction {
    db;
    constructor(db) {
        this.db = db;
    }
    async run(operation) {
        return this.db.transaction((tx) => operation({
            orderRepository: new DrizzleOrderRepository(tx),
            messageRepository: new DrizzleMessageRepository(tx),
        }));
    }
}
