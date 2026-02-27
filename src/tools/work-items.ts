/**
 * Work Items 相关工具（使用 GraphQL API）
 * - create_workitem_note：为工作项创建评论
 * - get_workitem_notes：获取工作项的评论列表
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitLabGraphQLClient } from "../gitlab-graphql-client.js";
import { handleGitLabError } from "../errors.js";
import type {
  CreateNoteResponse,
  GetWorkItemNotesResponse,
} from "../types/gitlab-graphql.js";

const CREATE_NOTE_MUTATION = `
  mutation createNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      note {
        id
        body
        createdAt
        updatedAt
        system
        author {
          id
          username
          name
        }
      }
      errors
    }
  }
`;

const GET_WORK_ITEM_NOTES_QUERY = `
  query getWorkItemNotes(
    $fullPath: ID!
    $iid: String!
    $after: String
    $before: String
    $first: Int
    $last: Int
  ) {
    workItem(fullPath: $fullPath, iid: $iid) {
      id
      iid
      title
      notes(after: $after, before: $before, first: $first, last: $last) {
        nodes {
          id
          body
          createdAt
          updatedAt
          system
          author {
            id
            username
            name
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`;

export function registerWorkItemTools(
  server: McpServer,
  graphqlClient: GitLabGraphQLClient
): void {
  server.registerTool(
    "create_workitem_note",
    {
      title: "创建工作项评论",
      description: "为 GitLab 工作项（Issue、Epic 等）创建评论",
      inputSchema: z.object({
        noteable_id: z
          .string()
          .describe("工作项的全局 GraphQL ID（如 gid://gitlab/Issue/123）"),
        body: z.string().describe("评论内容（支持 Markdown）"),
        internal: z
          .boolean()
          .optional()
          .describe("是否为内部评论（仅内部可见）"),
      }),
    },
    async ({ noteable_id, body, internal: isInternal }) => {
      try {
        const result = await graphqlClient.query<CreateNoteResponse>(
          CREATE_NOTE_MUTATION,
          {
            input: {
              noteableId: noteable_id,
              body,
              internal: isInternal,
            },
          }
        );

        if (result.createNote.errors && result.createNote.errors.length > 0) {
          throw new Error(
            `创建评论失败: ${result.createNote.errors.join(", ")}`
          );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.createNote.note, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "get_workitem_notes",
    {
      title: "获取工作项评论列表",
      description: "获取 GitLab 工作项的评论列表，支持 cursor 分页",
      inputSchema: z.object({
        full_path: z
          .string()
          .describe("项目或群组的完整路径（如 my-group/my-project）"),
        work_item_iid: z.string().describe("工作项在项目内的 IID"),
        after: z.string().optional().describe("游标：获取此游标之后的内容（向后翻页）"),
        before: z
          .string()
          .optional()
          .describe("游标：获取此游标之前的内容（向前翻页）"),
        first: z.number().optional().describe("返回前 N 条记录"),
        last: z.number().optional().describe("返回后 N 条记录"),
      }),
    },
    async ({ full_path, work_item_iid, after, before, first, last }) => {
      try {
        const result = await graphqlClient.query<GetWorkItemNotesResponse>(
          GET_WORK_ITEM_NOTES_QUERY,
          {
            fullPath: full_path,
            iid: work_item_iid,
            after,
            before,
            first,
            last,
          }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.workItem, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );
}
