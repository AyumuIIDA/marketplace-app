export class SendOrderMessageWorkflow {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async execute(input) {
        return this.deps.transaction.run(async (context) => {
            const order = await this.deps.orderFulfillmentService.getOrderForParticipant({
                orderId: input.orderId,
                participantId: input.senderId,
            }, context);
            const snapshot = order.snapshot;
            const recipientId = input.senderId === snapshot.buyerId ? snapshot.sellerId : snapshot.buyerId;
            return this.deps.sendMessageUseCase.executeWithContext({
                orderId: input.orderId,
                senderId: input.senderId,
                recipientId,
                agentId: input.agentId,
                body: input.body,
            }, context);
        });
    }
}
