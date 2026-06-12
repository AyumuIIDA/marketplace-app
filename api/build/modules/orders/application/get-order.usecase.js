import { toOrderOutput } from "./order.presenter.js";
export class GetOrderUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const order = await this.deps.orderFulfillmentService.getOrderForParticipant({
            orderId: input.orderId,
            participantId: input.participantId,
        }, this.deps.orderContext);
        return toOrderOutput(order);
    }
}
