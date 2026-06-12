import { Hono } from "hono";

import { getCurrentUser } from "../../../interface/http/index.js";
import type {
  GetCurrentUserUseCase,
  UpsertCurrentUserUseCase,
} from "../application/index.js";

import { upsertCurrentUserRequestSchema } from "./identity.dto.js";

export type IdentityControllerDeps = {
  getCurrentUserUseCase: GetCurrentUserUseCase;
  upsertCurrentUserUseCase: UpsertCurrentUserUseCase;
};

export function createIdentityController(deps: IdentityControllerDeps): Hono {
  const app = new Hono();

  app.get("/me", async (c) => {
    const currentUser = getCurrentUser(c);
    const output = await deps.getCurrentUserUseCase.execute({
      userId: currentUser.userId,
    });

    return c.json(output, 200);
  });

  app.put("/me", async (c) => {
    const currentUser = getCurrentUser(c);
    const body = upsertCurrentUserRequestSchema.parse(await c.req.json());
    const output = await deps.upsertCurrentUserUseCase.execute({
      userId: currentUser.userId,
      displayName: body.displayName,
      email: body.email,
      avatarUrl: body.avatarUrl,
    });

    return c.json(output, 200);
  });

  return app;
}
