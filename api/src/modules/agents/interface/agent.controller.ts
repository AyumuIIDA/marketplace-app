import { Hono } from "hono";

import { getCurrentUser } from "../../../interface/http/index.js";
import type {
  CreateAgentUseCase,
  DisableAgentUseCase,
  ListAgentsUseCase,
  RunDiscoverAgentUseCase,
} from "../application/index.js";

import {
  createAgentRequestSchema,
  listAgentsQuerySchema,
  runDiscoverAgentRequestSchema,
} from "./agent.dto.js";

export type AgentControllerDeps = {
  createAgentUseCase: CreateAgentUseCase;
  listAgentsUseCase: ListAgentsUseCase;
  disableAgentUseCase: DisableAgentUseCase;
  runDiscoverAgentUseCase: RunDiscoverAgentUseCase;
};

export function createAgentController(deps: AgentControllerDeps): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const currentUser = getCurrentUser(c);
    const query = listAgentsQuerySchema.parse({
      status: c.req.query("status"),
      limit: c.req.query("limit"),
    });
    const output = await deps.listAgentsUseCase.execute({
      userId: currentUser.userId,
      status: query.status,
      limit: query.limit,
    });

    return c.json(output, 200);
  });

  app.post("/", async (c) => {
    const currentUser = getCurrentUser(c);
    const body = createAgentRequestSchema.parse(await c.req.json());
    const output = await deps.createAgentUseCase.execute({
      userId: currentUser.userId,
      name: body.name,
    });

    return c.json(output, 201);
  });

  app.post("/:agentId/disable", async (c) => {
    const currentUser = getCurrentUser(c);
    const output = await deps.disableAgentUseCase.execute({
      agentId: c.req.param("agentId"),
      userId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  app.post("/runs", async (c) => {
    const currentUser = getCurrentUser(c);
    const body = runDiscoverAgentRequestSchema.parse(await c.req.json());
    const output = await deps.runDiscoverAgentUseCase.execute({
      userId: currentUser.userId,
      agentId: body.agentId,
      message: body.message,
      messages: body.messages,
    });

    return c.json(output, 200);
  });

  return app;
}
