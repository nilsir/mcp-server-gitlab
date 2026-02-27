/**
 * Merge Requests 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerMergeRequestTools } from "../../src/tools/merge-requests.js";
import { GitLabClient } from "../../src/gitlab-client.js";
import type { GitLabMergeRequest, GitLabCommit, GitLabDiff, GitLabPipeline } from "../../src/types/gitlab-rest.js";

const mockMR: GitLabMergeRequest = {
  id: 1,
  iid: 1,
  project_id: 1,
  title: "测试 MR",
  description: null,
  state: "opened",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  merged_at: null,
  source_branch: "feature/test",
  target_branch: "main",
  author: {
    id: 1,
    username: "testuser",
    name: "Test User",
    state: "active",
    avatar_url: "",
    web_url: "",
  },
  assignees: [],
  web_url: "https://gitlab.com/test/project/-/merge_requests/1",
  sha: "abc123",
  merge_commit_sha: null,
};

describe("Merge Requests 工具", () => {
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
    registerMergeRequestTools(server, mockClient);

    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  describe("create_merge_request", () => {
    it("应调用 POST API 创建 MR", async () => {
      vi.mocked(mockClient.post).mockResolvedValue(mockMR);

      const result = await client.callTool({
        name: "create_merge_request",
        arguments: {
          project_id: "test/project",
          title: "测试 MR",
          source_branch: "feature/test",
          target_branch: "main",
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/projects/test%2Fproject/merge_requests",
        expect.objectContaining({
          title: "测试 MR",
          source_branch: "feature/test",
          target_branch: "main",
        })
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabMergeRequest;
      expect(data.title).toBe("测试 MR");
    });
  });

  describe("get_merge_request", () => {
    it("应调用 GET API 获取 MR 详情", async () => {
      vi.mocked(mockClient.get).mockResolvedValue(mockMR);

      const result = await client.callTool({
        name: "get_merge_request",
        arguments: { project_id: "test/project", mr_iid: 1 },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/merge_requests/1"
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabMergeRequest;
      expect(data.iid).toBe(1);
    });
  });

  describe("get_merge_request_commits", () => {
    it("应返回 MR 的提交列表", async () => {
      const mockCommits: GitLabCommit[] = [
        {
          id: "abc123",
          short_id: "abc",
          title: "feat: add test",
          message: "feat: add test\n",
          author_name: "Test User",
          author_email: "test@example.com",
          authored_date: "2024-01-01T00:00:00Z",
          committer_name: "Test User",
          committer_email: "test@example.com",
          committed_date: "2024-01-01T00:00:00Z",
          web_url: "",
        },
      ];
      vi.mocked(mockClient.get).mockResolvedValue(mockCommits);

      const result = await client.callTool({
        name: "get_merge_request_commits",
        arguments: { project_id: "test/project", mr_iid: 1 },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/merge_requests/1/commits"
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabCommit[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
    });
  });

  describe("get_merge_request_diffs", () => {
    it("应返回 MR 的差异列表", async () => {
      const mockDiffs: GitLabDiff[] = [
        {
          old_path: "src/test.ts",
          new_path: "src/test.ts",
          a_mode: "100644",
          b_mode: "100644",
          diff: "@@ -1,1 +1,2 @@\n+new line",
          new_file: false,
          renamed_file: false,
          deleted_file: false,
        },
      ];
      vi.mocked(mockClient.get).mockResolvedValue(mockDiffs);

      const result = await client.callTool({
        name: "get_merge_request_diffs",
        arguments: { project_id: "test/project", mr_iid: 1 },
      });

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabDiff[];
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("get_merge_request_pipelines", () => {
    it("应返回 MR 关联的 Pipeline 列表", async () => {
      const mockPipelines: GitLabPipeline[] = [];
      vi.mocked(mockClient.get).mockResolvedValue(mockPipelines);

      const result = await client.callTool({
        name: "get_merge_request_pipelines",
        arguments: { project_id: "test/project", mr_iid: 1 },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/merge_requests/1/pipelines"
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabPipeline[];
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
