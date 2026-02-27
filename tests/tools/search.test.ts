/**
 * 搜索工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerSearchTools } from "../../src/tools/search.js";
import { GitLabClient } from "../../src/gitlab-client.js";
import { GitLabGraphQLClient } from "../../src/gitlab-graphql-client.js";
import type { GitLabLabel, GitLabSearchResult } from "../../src/types/gitlab-rest.js";
import type { CodeSnippetSearchResponse } from "../../src/types/gitlab-graphql.js";

describe("搜索工具", () => {
  let server: McpServer;
  let client: Client;
  let mockClient: GitLabClient;
  let mockGraphqlClient: GitLabGraphQLClient;

  beforeEach(async () => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as GitLabClient;

    mockGraphqlClient = {
      query: vi.fn(),
    } as unknown as GitLabGraphQLClient;

    server = new McpServer({ name: "test", version: "1.0.0" });
    registerSearchTools(server, mockClient, mockGraphqlClient);

    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  describe("search", () => {
    it("全局搜索时应使用 /search 路径", async () => {
      const mockResults: GitLabSearchResult[] = [];
      vi.mocked(mockClient.get).mockResolvedValue(mockResults);

      await client.callTool({
        name: "search",
        arguments: { scope: "issues", search: "bug" },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/search",
        expect.objectContaining({ scope: "issues", search: "bug" })
      );
    });

    it("指定 project_id 时应使用项目搜索路径", async () => {
      const mockResults: GitLabSearchResult[] = [
        { id: 1, title: "test issue", web_url: "" },
      ];
      vi.mocked(mockClient.get).mockResolvedValue(mockResults);

      const result = await client.callTool({
        name: "search",
        arguments: {
          scope: "issues",
          search: "test",
          project_id: "test/project",
        },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/search",
        expect.any(Object)
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabSearchResult[];
      expect(Array.isArray(data)).toBe(true);
    });

    it("指定 group_id 时应使用群组搜索路径", async () => {
      vi.mocked(mockClient.get).mockResolvedValue([]);

      await client.callTool({
        name: "search",
        arguments: {
          scope: "merge_requests",
          search: "feature",
          group_id: "my-group",
        },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/groups/my-group/search",
        expect.any(Object)
      );
    });
  });

  describe("search_labels", () => {
    it("应通过 project_id 搜索标签", async () => {
      const mockLabels: GitLabLabel[] = [
        {
          id: 1,
          name: "bug",
          color: "#cc0033",
          description: "Bug 标签",
          text_color: "#FFFFFF",
        },
      ];
      vi.mocked(mockClient.get).mockResolvedValue(mockLabels);

      const result = await client.callTool({
        name: "search_labels",
        arguments: { project_id: "test/project", search: "bug" },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/projects/test%2Fproject/labels",
        expect.objectContaining({ search: "bug" })
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as GitLabLabel[];
      expect(data[0].name).toBe("bug");
    });

    it("应通过 group_id 搜索标签", async () => {
      vi.mocked(mockClient.get).mockResolvedValue([]);

      await client.callTool({
        name: "search_labels",
        arguments: { group_id: "my-group" },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        "/groups/my-group/labels",
        expect.any(Object)
      );
    });

    it("未提供 project_id 或 group_id 时应返回 isError=true 的响应", async () => {
      const result = await client.callTool({
        name: "search_labels",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      const content = result.content[0] as { type: string; text: string };
      expect(content.text).toContain("project_id");
    });
  });

  describe("semantic_code_search", () => {
    it("应调用 GraphQL 进行语义搜索", async () => {
      const mockResponse: CodeSnippetSearchResponse = {
        codeSnippetSearch: {
          nodes: [
            {
              filename: "src/auth.ts",
              projectPath: "test/project",
              ref: "main",
              startLine: 10,
              data: "function authenticate(token: string) {",
              blobPath: "/test/project/-/blob/main/src/auth.ts",
            },
          ],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      };
      vi.mocked(mockGraphqlClient.query).mockResolvedValue(mockResponse);

      const result = await client.callTool({
        name: "semantic_code_search",
        arguments: {
          project_path: "test/project",
          search: "how to authenticate users",
        },
      });

      expect(mockGraphqlClient.query).toHaveBeenCalledWith(
        expect.stringContaining("codeSnippetSearch"),
        expect.objectContaining({
          projectPath: "test/project",
          search: "how to authenticate users",
        })
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as { nodes: unknown[] };
      expect(data.nodes).toHaveLength(1);
    });
  });
});
