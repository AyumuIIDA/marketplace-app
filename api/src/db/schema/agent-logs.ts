import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { agents } from "./agents.js";
import { aiActionTypeEnum, mcpToolCallStatusEnum } from "./enums.js";
import { users } from "./users.js";

export const mcpToolCalls = pgTable(
  "mcp_tool_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    toolName: varchar("tool_name", { length: 120 }).notNull(),
    inputSummary: jsonb("input_summary"),
    outputSummary: jsonb("output_summary"),
    status: mcpToolCallStatusEnum("status").notNull().default("STARTED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mcp_tool_calls_user_id_idx").on(table.userId),
    index("mcp_tool_calls_agent_id_idx").on(table.agentId),
    index("mcp_tool_calls_tool_name_idx").on(table.toolName),
    index("mcp_tool_calls_created_at_idx").on(table.createdAt),
  ],
);

export const aiActionLogs = pgTable(
  "ai_action_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").references(() => agents.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    actionType: aiActionTypeEnum("action_type").notNull(),
    resourceType: varchar("resource_type", { length: 80 }),
    resourceId: uuid("resource_id"),
    model: varchar("model", { length: 120 }),
    promptSummary: jsonb("prompt_summary"),
    resultSummary: jsonb("result_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_action_logs_user_id_idx").on(table.userId),
    index("ai_action_logs_agent_id_idx").on(table.agentId),
    index("ai_action_logs_resource_idx").on(table.resourceType, table.resourceId),
    index("ai_action_logs_created_at_idx").on(table.createdAt),
  ],
);
