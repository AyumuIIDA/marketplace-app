import { pgEnum } from "drizzle-orm/pg-core";
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);
export const agentStatusEnum = pgEnum("agent_status", ["ACTIVE", "DISABLED"]);
export const listingStatusEnum = pgEnum("listing_status", [
    "DRAFT",
    "PUBLISHED",
    "SOLD",
    "HIDDEN",
]);
export const orderStatusEnum = pgEnum("order_status", [
    "PAID",
    "SHIPPED",
    "RECEIVED",
    "COMPLETED",
    "CANCELED",
]);
export const reviewStatusEnum = pgEnum("review_status", [
    "DRAFT",
    "SUBMITTED",
    "HIDDEN",
]);
export const messageStatusEnum = pgEnum("message_status", ["SENT", "HIDDEN"]);
export const signatureStatusEnum = pgEnum("signature_status", [
    "VALID",
    "REVOKED",
]);
export const signatureFormatEnum = pgEnum("signature_format", ["JWS"]);
export const mcpToolCallStatusEnum = pgEnum("mcp_tool_call_status", [
    "STARTED",
    "SUCCEEDED",
    "FAILED",
    "REQUIRES_HUMAN_SIGNATURE",
    "REQUIRES_CONFIRMATION",
]);
export const aiActionTypeEnum = pgEnum("ai_action_type", [
    "CREATE_LISTING_DRAFT",
    "PUBLISH_LISTING",
    "UPDATE_LISTING",
    "SEARCH_LISTINGS",
    "COMPARE_LISTINGS",
    "SUGGEST_PRICE",
    "SUGGEST_MESSAGE",
    "SEND_MESSAGE",
    "PREPARE_PURCHASE",
    "PURCHASE_ITEM",
    "SUGGEST_REVIEW",
    "SUBMIT_REVIEW",
]);
