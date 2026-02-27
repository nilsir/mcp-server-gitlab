/**
 * Pipelines 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerPipelineTools } from "../../src/tools/pipelines.js";
import { GitLabClient } from "../../src/gitlab-client.js";
import type { GitLabJob, GitLabPipeline } from "../../src/types/gitlab-rest.js";

const mockPipeline: GitLabPipeline = {
  id: 100,
  iid: 1,
  project_id: 1,
  sha: "abc123",
  ref: "main",
  status: "success",
  source: "push",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  web_url: "https://gitlab.com/test/project/-/pipelines/100",
  name: null,
};

describe("Pipelines 工具", () => {
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
    registerPipelineTools(server, mockClient);

    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  describe("get_pipeline_jobs", () => {
    it("应返回 Pipeline 的 Job 列表", async () => {
      const mockJobs: GitLabJob[] = [
        {
          id: 1,
          status: "success",
          stage: "build",
          name: "build-job",
          ref: "main",
          created_at: "2024-01-01T00:00:00Z",
          started_at: "2024-01-01T00:01:00Z",
          finished_at: "2024-01-01T00:05:00Z",
          duration: 240,
          web_url: "",
          pipeline: {
            id: 100,
            ref: "main",
            sha: "abc123",
            status: "success",
          },
        },
      ];
      vi.mocked(mockClient.get).mockResolvedValue(mockJobs);

      const result = await client.callTool({
        name: "get_pipeline_jobs",
        arguments: { project_id: "test/project", pipeline_id: 100 },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipelines/100/jobs",
        { scope: undefined }
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabJob[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
    });
  });

  describe("manage_pipeline", () => {
    it("list=true 时应列出 Pipeline 列表", async () => {
      vi.mocked(mockClient.get).mockResolvedValue([mockPipeline]);

      const result = await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project", list: true },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipelines",
        expect.any(Object)
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabPipeline[];
      expect(Array.isArray(data)).toBe(true);
    });

    it("提供 ref 时应创建新 Pipeline", async () => {
      vi.mocked(mockClient.post).mockResolvedValue(mockPipeline);

      const result = await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project", ref: "main" },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipeline",
        { ref: "main" }
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabPipeline;
      expect(data.ref).toBe("main");
    });

    it("retry=true 时应重试 Pipeline", async () => {
      vi.mocked(mockClient.post).mockResolvedValue(mockPipeline);

      await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project", pipeline_id: 100, retry: true },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipelines/100/retry"
      );
    });

    it("cancel=true 时应取消 Pipeline", async () => {
      vi.mocked(mockClient.post).mockResolvedValue({ ...mockPipeline, status: "canceled" });

      await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project", pipeline_id: 100, cancel: true },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipelines/100/cancel"
      );
    });

    it("提供 name 时应更新 Pipeline 名称", async () => {
      vi.mocked(mockClient.put).mockResolvedValue({ ...mockPipeline, name: "新名称" });

      await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project", pipeline_id: 100, name: "新名称" },
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipelines/100/metadata",
        { name: "新名称" }
      );
    });

    it("只有 pipeline_id 时应删除 Pipeline", async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(null);

      const result = await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project", pipeline_id: 100 },
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/projects/test%2Fproject/pipelines/100"
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as { success: boolean };
      expect(data.success).toBe(true);
    });

    it("无参数时应返回 isError=true 的响应", async () => {
      const result = await client.callTool({
        name: "manage_pipeline",
        arguments: { project_id: "test/project" },
      });

      expect(result.isError).toBe(true);
      const content = result.content[0] as { type: string; text: string };
      expect(content.text).toContain("pipeline_id");
    });
  });
});
