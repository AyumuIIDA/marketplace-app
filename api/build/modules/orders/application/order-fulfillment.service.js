import { AuthorizationError, NotFoundError } from "../../../shared/index.js";
import { Order } from "../domain/index.js";
import { toOrderOutput } from "./order.presenter.js";
export class OrderFulfillmentService {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async createPaidOrder(input, context) {
        const existing = await context.orderRepository.findByListingId(input.listingId);
        if (existing !== undefined) {
            throw new AuthorizationError("This listing already has an order.", {
                listingId: input.listingId,
                orderId: existing.id,
            });
        }
        const order = Order.createPaid({
            id: this.deps.idGenerator.newId(),
            listingId: input.listingId,
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            price: input.price,
            currency: input.currency,
            now: this.deps.clock.now(),
        });
        await context.orderRepository.save(order);
        return toOrderOutput(order);
    }
    async getOrderForParticipant(input, context) {
        const order = await context.orderRepository.findById(input.orderId);
        if (order === undefined) {
            throw new NotFoundError("Order", input.orderId);
        }
        if (order.buyerId !== input.participantId && order.sellerId !== input.participantId) {
            throw new AuthorizationError("Only order participants can access this order.", {
                orderId: input.orderId,
                participantId: input.participantId,
            });
        }
        return order;
    }
}
