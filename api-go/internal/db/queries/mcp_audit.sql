-- name: InsertMcpToolCall :exec
INSERT INTO mcp_tool_calls (
    id, agent_id, user_id, tool_name, input_summary, output_summary, status, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
);
