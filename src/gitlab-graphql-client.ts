/**
 * GitLab GraphQL API 客户端
 * 用于 work items notes 和 semantic_code_search
 */

import { handleGitLabError } from "./errors.js";

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>;
}

export class GitLabGraphQLClient {
  private readonly endpoint: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.endpoint = `${baseUrl}/api/graphql`;
    this.token = token;
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        let message = response.statusText;
        try {
          const body = await response.json() as { message?: string };
          message = body.message ?? message;
        } catch {
          // 忽略解析错误
        }
        const error = new Error(message) as Error & { status: number };
        error.status = response.status;
        throw error;
      }

      const result = await response.json() as GraphQLResponse<T>;

      if (result.errors && result.errors.length > 0) {
        const messages = result.errors.map((e) => e.message).join("; ");
        throw new Error(`GraphQL 错误: ${messages}`);
      }

      return result.data as T;
    } catch (error) {
      handleGitLabError(error);
    }
  }
}
