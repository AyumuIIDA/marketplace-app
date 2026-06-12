import { toOrderOutput } from "./order.presenter.js";
export class ListOrdersUseCase {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        const orders = await this.deps.orderRepository.search({
            participantId: input.participantId,
            status: input.status,
            limit: input.limit,
        });
        return {
            items: orders.map(toOrderOutput),
        };
    }
}
