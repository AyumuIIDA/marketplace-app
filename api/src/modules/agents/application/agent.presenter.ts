import type { Agent, AgentStatus } from "../domain/index.js";

export type AgentOutput = {
  agentId: string;
  userId: string;
  name: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
};

export function toAgentOutput(agent: Agent): AgentOutput {
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
