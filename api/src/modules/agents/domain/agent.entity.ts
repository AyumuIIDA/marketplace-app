import { DomainError } from "../../../shared/index.js";

import type { AgentStatus } from "./agent-status.type.js";

export type AgentProps = {
  id: string;
  userId: string;
  name: string;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAgentProps = {
  id: string;
  userId: string;
  name: string;
  now: Date;
};

export class Agent {
  private constructor(private props: AgentProps) {}

  static create(input: CreateAgentProps): Agent {
    validateAgentName(input.name);

    return new Agent({
      id: input.id,
      userId: input.userId,
      name: input.name,
      status: "ACTIVE",
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static rehydrate(props: AgentProps): Agent {
    return new Agent({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): AgentStatus {
    return this.props.status;
  }

  get snapshot(): AgentProps {
    return { ...this.props };
  }

  disable(actorUserId: string, now: Date): void {
    if (actorUserId !== this.props.userId) {
      throw new DomainError("AGENT_OWNER_INVALID", "Only the agent owner can disable the agent.", {
        agentId: this.props.id,
        actorUserId,
      });
    }

    this.props = {
      ...this.props,
      status: "DISABLED",
      updatedAt: now,
    };
  }
}

export function validateAgentName(name: string): void {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new DomainError("AGENT_NAME_REQUIRED", "Agent name is required.");
  }
  if (trimmed.length > 120) {
    throw new DomainError("AGENT_NAME_TOO_LONG", "Agent name must be 120 characters or fewer.", {
      length: trimmed.length,
    });
  }
}
