/**
 * GitLab REST API 客户端
 * 封装原生 fetch，统一处理认证、错误和路径编码
 */

import { handleGitLabError } from "./errors.js";

export class GitLabClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}/api/v4${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = response.statusText;
      try {
        const body = await response.json() as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        // 忽略解析错误，使用 statusText
      }
      const error = new Error(message) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) {
      return null as T;
    }
    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    try {
      const response = await fetch(this.buildUrl(path, params), {
        method: "GET",
        headers: this.buildHeaders(),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      handleGitLabError(error);
    }
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await fetch(this.buildUrl(path), {
        method: "POST",
        headers: this.buildHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      handleGitLabError(error);
    }
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await fetch(this.buildUrl(path), {
        method: "PUT",
        headers: this.buildHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      handleGitLabError(error);
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      const response = await fetch(this.buildUrl(path), {
        method: "DELETE",
        headers: this.buildHeaders(),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      handleGitLabError(error);
    }
  }

  /**
   * 对项目 ID 进行 URL 编码（支持 namespace/project 格式）
   */
  static encodeProjectId(id: string | number): string {
    return encodeURIComponent(String(id));
  }
}
