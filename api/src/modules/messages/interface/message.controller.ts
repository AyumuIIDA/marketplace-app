import { Hono } from "hono";

import { getCurrentUser } from "../../../interface/http/index.js";
import type { HideMessageUseCase } from "../application/index.js";
import type {
  ListOrderMessagesOperation,
  SendOrderMessageOperation,
} from "../../../app/workflows/index.js";

import { listMessagesQuerySchema, sendMessageRequestSchema } from "./message.dto.js";

export type MessageControllerDeps = {
  hideMessageUseCase: HideMessageUseCase;
  listOrderMessagesWorkflow: ListOrderMessagesOperation;
  sendOrderMessageWorkflow: SendOrderMessageOperation;
};

export function createOrderMessageController(deps: MessageControllerDeps): Hono {
  const app = new Hono();

  app.get("/:orderId/messages", async (c) => {
    const currentUser = getCurrentUser(c);
    const query = listMessagesQuerySchema.parse({
      status: c.req.query("status"),
      limit: c.req.query("limit"),
    });
    const output = await deps.listOrderMessagesWorkflow.execute({
      orderId: c.req.param("orderId"),
      participantId: currentUser.userId,
      status: query.status,
      limit: query.limit,
    });

    return c.json(output, 200);
  });

  app.post("/:orderId/messages", async (c) => {
    const currentUser = getCurrentUser(c);
    const body = sendMessageRequestSchema.parse(await c.req.json());
    const output = await deps.sendOrderMessageWorkflow.execute({
      orderId: c.req.param("orderId"),
      senderId: currentUser.userId,
      body: body.body,
      agentId: body.agentId,
    });

    return c.json(output, 201);
  });

  return app;
}

export function createMessageController(deps: MessageControllerDeps): Hono {
  const app = new Hono();

  app.post("/:messageId/hide", async (c) => {
    const currentUser = getCurrentUser(c);
    const output = await deps.hideMessageUseCase.execute({
      messageId: c.req.param("messageId"),
      actorId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  return app;
}
