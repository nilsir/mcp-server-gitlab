/**
 * GitLab REST 客户端测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GitLabClient } from "../src/gitlab-client.js";

describe("GitLabClient", () => {
  let client: GitLabClient;

  beforeEach(() => {
    client = new GitLabClient("https://gitlab.example.com", "test-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("encodeProjectId", () => {
    it("应对包含斜线的项目路径进行编码", () => {
      expect(GitLabClient.encodeProjectId("my-group/my-project")).toBe(
        "my-group%2Fmy-project"
      );
    });

    it("应对纯数字 ID 保持不变", () => {
      expect(GitLabClient.encodeProjectId(123)).toBe("123");
    });

    it("应对多级路径进行完整编码", () => {
      expect(
        GitLabClient.encodeProjectId("group/subgroup/project")
      ).toBe("group%2Fsubgroup%2Fproject");
    });
  });

  describe("get", () => {
    it("应发送带认证头的 GET 请求", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1, name: "test" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await client.get<{ id: number; name: string }>("/projects/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://gitlab.example.com/api/v4/projects/1",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
      expect(result).toEqual({ id: 1, name: "test" });
    });

    it("应正确处理查询参数", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.get("/projects", { page: 1, per_page: 20, state: "opened" });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("per_page=20");
      expect(callUrl).toContain("state=opened");
    });

    it("HTTP 4xx 错误应抛出携带 status 的 Error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve({ message: "404 Project Not Found" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(client.get("/projects/999")).rejects.toThrow();
    });
  });

  describe("post", () => {
    it("应发送 JSON 请求体", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 1 }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await client.post("/projects/1/issues", { title: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "test" }),
        })
      );
    });
  });

  describe("delete", () => {
    it("204 响应应返回 null", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(null),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await client.delete("/projects/1/pipelines/100");
      expect(result).toBeNull();
    });
  });
});
