/**
 * 错误处理模块
 * 将 GitLab API 错误统一转换为 MCP McpError
 */

import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export interface GitLabApiError {
  status?: number;
  message?: string;
}

/**
 * 将 GitLab API 错误转换为 McpError
 * HTTP 4xx → InvalidParams，5xx → InternalError
 */
export function handleGitLabError(error: unknown): never {
  if (error instanceof McpError) {
    throw error;
  }

  if (error instanceof Error) {
    const apiError = error as Error & { status?: number };
    const status = apiError.status;

    if (status !== undefined && status >= 400 && status < 500) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `GitLab API 客户端错误 (${status}): ${error.message}`
      );
    }

    if (status !== undefined && status >= 500) {
      throw new McpError(
        ErrorCode.InternalError,
        `GitLab API 服务端错误 (${status}): ${error.message}`
      );
    }

    throw new McpError(ErrorCode.InternalError, `GitLab API 错误: ${error.message}`);
  }

  throw new McpError(ErrorCode.InternalError, `未知错误: ${String(error)}`);
}
