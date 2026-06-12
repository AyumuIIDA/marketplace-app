import type { Context } from "hono";

import { AuthorizationError } from "../../shared/index.js";

export type CurrentUser = {
  userId: string;
};

export function getCurrentUser(c: Context): CurrentUser {
  const userId = c.req.header("x-user-id");

  if (userId === undefined || userId.trim().length === 0) {
    throw new AuthorizationError("x-user-id header is required for MVP authentication.");
  }

  return { userId };
}

