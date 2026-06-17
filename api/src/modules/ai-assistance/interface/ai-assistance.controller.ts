import { Hono } from "hono";

import { getCurrentUser } from "../../../interface/http/index.js";
import type { SuggestListingFieldsUseCase } from "../application/index.js";

import { suggestListingFieldsRequestSchema } from "./ai-assistance.dto.js";

export type AiAssistanceControllerDeps = {
  suggestListingFieldsUseCase: SuggestListingFieldsUseCase;
};

export function createAiAssistanceController(deps: AiAssistanceControllerDeps): Hono {
  const app = new Hono();

  app.post("/listing-fields", async (c) => {
    getCurrentUser(c);
    const body = suggestListingFieldsRequestSchema.parse(await c.req.json());
    const output = await deps.suggestListingFieldsUseCase.execute({
      userHint: body.userHint,
      imageUrls: body.imageUrls,
    });

    return c.json(output, 200);
  });

  return app;
}
