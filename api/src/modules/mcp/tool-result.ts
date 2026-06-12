import { AppError } from "../../shared/index.js";

export type ToolResultStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "REQUIRES_HUMAN_SIGNATURE"
  | "REQUIRES_CONFIRMATION";

export type ToolResult<TData = unknown> =
  | {
      status: "SUCCEEDED";
      data: TData;
    }
  | {
      status: "REQUIRES_HUMAN_SIGNATURE";
      data: TData;
    }
  | {
      status: "REQUIRES_CONFIRMATION";
      data: TData;
    }
  | {
      status: "FAILED";
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };

export function toolSucceeded<TData>(data: TData): ToolResult<TData> {
  return {
    status: "SUCCEEDED",
    data,
  };
}

export function toolRequiresHumanSignature<TData>(data: TData): ToolResult<TData> {
  return {
    status: "REQUIRES_HUMAN_SIGNATURE",
    data,
  };
}

export function toolRequiresConfirmation<TData>(data: TData): ToolResult<TData> {
  return {
    status: "REQUIRES_CONFIRMATION",
    data,
  };
}

export function toolFailed(error: unknown): ToolResult<never> {
  if (error instanceof AppError) {
    return {
      status: "FAILED",
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    status: "FAILED",
    error: {
      code: "UNKNOWN_ERROR",
      message: "Unknown MCP tool error.",
    },
  };
}
