import { toOrderOutput } from "./order.presenter.js";
export class MarkOrderReceivedUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const order = await this.deps.orderFulfillmentService.getOrderForParticipant({
            orderId: input.orderId,
            participantId: input.buyerId,
        }, this.deps.orderContext);
        order.markReceived(input.buyerId, this.deps.clock.now());
        await this.deps.orderContext.orderRepository.save(order);
        return toOrderOutput(order);
    }
}
