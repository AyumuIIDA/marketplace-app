export function toAgentOutput(agent) {
    const snapshot = agent.snapshot;
    return {
        agentId: snapshot.id,
        userId: snapshot.userId,
        name: snapshot.name,
        status: snapshot.status,
        createdAt: snapshot.createdAt.toISOString(),
        updatedAt: snapshot.updatedAt.toISOString(),
    };
}
