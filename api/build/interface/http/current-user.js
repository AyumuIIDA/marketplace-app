import { AuthorizationError } from "../../shared/index.js";
export function getCurrentUser(c) {
    const userId = c.req.header("x-user-id");
    if (userId === undefined || userId.trim().length === 0) {
        throw new AuthorizationError("x-user-id header is required for MVP authentication.");
    }
    return { userId };
}
