export function toMessageOutput(message) {
    const snapshot = message.snapshot;
    return {
        messageId: snapshot.id,
        orderId: snapshot.orderId,
        senderId: snapshot.senderId,
        recipientId: snapshot.recipientId,
        agentId: snapshot.agentId,
        body: snapshot.body,
        status: snapshot.status,
        createdAt: snapshot.createdAt.toISOString(),
        hiddenAt: snapshot.hiddenAt?.toISOString(),
    };
}
