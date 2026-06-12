import { toOrderOutput } from "./order.presenter.js";
export class MarkOrderShippedUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const order = await this.deps.orderFulfillmentService.getOrderForParticipant({
            orderId: input.orderId,
            participantId: input.sellerId,
        }, this.deps.orderContext);
        order.markShipped(input.sellerId, this.deps.clock.now());
        await this.deps.orderContext.orderRepository.save(order);
        return toOrderOutput(order);
    }
}
