import { Hono } from "hono";

import { getCurrentUser } from "../../../interface/http/index.js";
import type {
  GetOrderUseCase,
  ListOrdersUseCase,
  MarkOrderReceivedUseCase,
  MarkOrderShippedUseCase,
} from "../application/index.js";

import { listOrdersQuerySchema } from "./order.dto.js";

export type OrderControllerDeps = {
  getOrderUseCase: GetOrderUseCase;
  listOrdersUseCase: ListOrdersUseCase;
  markOrderShippedUseCase: MarkOrderShippedUseCase;
  markOrderReceivedUseCase: MarkOrderReceivedUseCase;
};

export function createOrderController(deps: OrderControllerDeps): Hono {
  const app = new Hono();

  app.get("/", async (c) => {
    const currentUser = getCurrentUser(c);
    const query = listOrdersQuerySchema.parse({
      status: c.req.query("status"),
      limit: c.req.query("limit"),
    });
    const output = await deps.listOrdersUseCase.execute({
      participantId: currentUser.userId,
      status: query.status,
      limit: query.limit,
    });

    return c.json(output, 200);
  });

  app.get("/:orderId", async (c) => {
    const currentUser = getCurrentUser(c);
    const output = await deps.getOrderUseCase.execute({
      orderId: c.req.param("orderId"),
      participantId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  app.post("/:orderId/ship", async (c) => {
    const currentUser = getCurrentUser(c);
    const output = await deps.markOrderShippedUseCase.execute({
      orderId: c.req.param("orderId"),
      sellerId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  app.post("/:orderId/receive", async (c) => {
    const currentUser = getCurrentUser(c);
    const output = await deps.markOrderReceivedUseCase.execute({
      orderId: c.req.param("orderId"),
      buyerId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  return app;
}
