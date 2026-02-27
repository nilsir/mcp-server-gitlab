/**
 * Work Items 工具测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerWorkItemTools } from "../../src/tools/work-items.js";
import { GitLabGraphQLClient } from "../../src/gitlab-graphql-client.js";
import type {
  CreateNoteResponse,
  GetWorkItemNotesResponse,
} from "../../src/types/gitlab-graphql.js";

const mockNote = {
  id: "gid://gitlab/Note/1",
  body: "这是一条测试评论",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  system: false,
  author: {
    id: "gid://gitlab/User/1",
    username: "testuser",
    name: "Test User",
  },
};

describe("Work Items 工具", () => {
  let server: McpServer;
  let client: Client;
  let mockGraphqlClient: GitLabGraphQLClient;

  beforeEach(async () => {
    mockGraphqlClient = {
      query: vi.fn(),
    } as unknown as GitLabGraphQLClient;

    server = new McpServer({ name: "test", version: "1.0.0" });
    registerWorkItemTools(server, mockGraphqlClient);

    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  describe("create_workitem_note", () => {
    it("应调用 GraphQL mutation 创建评论", async () => {
      const mockResponse: CreateNoteResponse = {
        createNote: {
          note: mockNote,
          errors: [],
        },
      };
      vi.mocked(mockGraphqlClient.query).mockResolvedValue(mockResponse);

      const result = await client.callTool({
        name: "create_workitem_note",
        arguments: {
          noteable_id: "gid://gitlab/Issue/1",
          body: "这是一条测试评论",
        },
      });

      expect(mockGraphqlClient.query).toHaveBeenCalledWith(
        expect.stringContaining("createNote"),
        expect.objectContaining({
          input: expect.objectContaining({
            noteableId: "gid://gitlab/Issue/1",
            body: "这是一条测试评论",
          }),
        })
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as typeof mockNote;
      expect(data.body).toBe("这是一条测试评论");
    });

    it("当 GraphQL 返回错误时应返回 isError=true 的响应", async () => {
      const mockResponse: CreateNoteResponse = {
        createNote: {
          note: null,
          errors: ["工作项不存在"],
        },
      };
      vi.mocked(mockGraphqlClient.query).mockResolvedValue(mockResponse);

      const result = await client.callTool({
        name: "create_workitem_note",
        arguments: {
          noteable_id: "gid://gitlab/Issue/999",
          body: "测试",
        },
      });

      expect(result.isError).toBe(true);
      const content = result.content[0] as { type: string; text: string };
      expect(content.text).toContain("工作项不存在");
    });
  });

  describe("get_workitem_notes", () => {
    it("应返回工作项的评论列表", async () => {
      const mockResponse: GetWorkItemNotesResponse = {
        workItem: {
          id: "gid://gitlab/Issue/1",
          iid: "1",
          title: "测试 Issue",
          notes: {
            nodes: [mockNote],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          },
        },
      };
      vi.mocked(mockGraphqlClient.query).mockResolvedValue(mockResponse);

      const result = await client.callTool({
        name: "get_workitem_notes",
        arguments: {
          full_path: "test/project",
          work_item_iid: "1",
        },
      });

      expect(mockGraphqlClient.query).toHaveBeenCalledWith(
        expect.stringContaining("workItem"),
        expect.objectContaining({
          fullPath: "test/project",
          iid: "1",
        })
      );

      const content = result.content[0] as { type: string; text: string };
      const data = JSON.parse(content.text) as { notes: { nodes: typeof mockNote[] } };
      expect(data.notes.nodes).toHaveLength(1);
    });

    it("支持分页参数", async () => {
      const mockResponse: GetWorkItemNotesResponse = {
        workItem: {
          id: "gid://gitlab/Issue/1",
          iid: "1",
          title: "测试 Issue",
          notes: {
            nodes: [],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          },
        },
      };
      vi.mocked(mockGraphqlClient.query).mockResolvedValue(mockResponse);

      await client.callTool({
        name: "get_workitem_notes",
        arguments: {
          full_path: "test/project",
          work_item_iid: "1",
          first: 10,
          after: "cursor123",
        },
      });

      expect(mockGraphqlClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          first: 10,
          after: "cursor123",
        })
      );
    });
  });
});
