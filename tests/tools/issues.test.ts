/**
 * Issues 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerIssueTools } from "../../src/tools/issues.js";
import { GitLabClient } from "../../src/gitlab-client.js";
import type { GitLabIssue } from "../../src/types/gitlab-rest.js";

const mockIssue: GitLabIssue = {
  id: 1,
  iid: 1,
  project_id: 1,
  title: "测试 Issue",
  description: "这是一个测试 Issue",
  state: "opened",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  closed_at: null,
  labels: [],
  milestone: null,
  assignees: [],
  author: {
    id: 1,
    username: "testuser",
    name: "Test User",
    state: "active",
    avatar_url: "",
    web_url: "https://gitlab.com/testuser",
  },
  web_url: "https://gitlab.com/test/project/-/issues/1",
};

describe("Issues 工具", () => {
  let server: McpServer;
  let client: Client;
  let mockClient: GitLabClient;

  beforeEach(async () => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as GitLabClient;

    server = new McpServer({ name: "test", version: "1.0.0" });
    registerIssueTools(server, mockClient);

    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  describe("create_issue", () => {
    it("应调用 POST API 创建 Issue", async () => {
      vi.mocked(mockClient.post).mockResolvedValue(mockIssue);

      const result = await client.callTool({
        name: "create_issue",
        arguments: {
          project_id: "test/project",
          title: "测试 Issue",
          description: "这是一个测试 Issue",
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/projects/test%2Fproject/issues",
        expect.objectContaining({ title: "测试 Issue" })
      );

      const content = result.content[0] as { type: string; text: string };
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text) as GitLabIssue;
      expect(data.title).toBe("测试 Issue");
    });

    it("当 API 返回错误时应返回 isError=true 的响应", async () => {
      const apiError = new Error("Unauthorized") as Error & { status: number };
      apiError.status = 401;
      vi.mocked(mockClient.post).mockRejectedValue(apiError);

      const result = await client.callTool({
        name: "create_issue",
        arguments: { project_id: "test/project", title: "测试" },
      });

      expect(result.isError).toBe(true);
      const content = result.content[0] as { type: string; text: string };
      expect(content.text).toContain("401");
    });
  });

  describe("get_issue", () => {
    it("应调用 GET API 获取 Issue 详情", async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockIssue);

      const result = await client.callTool({
        name: "get_issue",
        arguments: { project_id: "test/project", issue_iid: 1 },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/issues/1"
      );

      const content = result.content[0] as { type: string; text: string };
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text) as GitLabIssue;
      expect(data.iid).toBe(1);
    });

    it("当 Issue 不存在时应返回 isError=true 的响应", async () => {
      const apiError = new Error("Not Found") as Error & { status: number };
      apiError.status = 404;
      vi.mocked(mockClient.get).mockRejectedValue(apiError);

      const result = await client.callTool({
        name: "get_issue",
        arguments: { project_id: "test/project", issue_iid: 999 },
      });

      expect(result.isError).toBe(true);
      const content = result.content[0] as { type: string; text: string };
      expect(content.text).toContain("404");
    });
  });
});
