export class ListOrderMessagesWorkflow {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.deps.transaction.run(async (context) => {
            await this.deps.orderFulfillmentService.getOrderForParticipant({
                orderId: input.orderId,
                participantId: input.participantId,
            }, context);
            return this.deps.listMessagesUseCase.execute({
                orderId: input.orderId,
                participantId: input.participantId,
                status: input.status,
                limit: input.limit,
            });
        });
    }
}
