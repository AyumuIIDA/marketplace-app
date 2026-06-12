import type { Agent } from "./agent.entity.js";
import type { AgentStatus } from "./agent-status.type.js";

export type SearchAgentsInput = {
  userId?: string;
  status?: AgentStatus;
  limit?: number;
};

export interface AgentRepository {
  save(agent: Agent): Promise<void>;
  findById(agentId: string): Promise<Agent | undefined>;
  search(input: SearchAgentsInput): Promise<Agent[]>;
}
