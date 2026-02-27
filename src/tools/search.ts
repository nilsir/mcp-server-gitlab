/**
 * 搜索相关工具
 * - search：全文搜索（全局/群组/项目范围）
 * - search_labels：搜索标签
 * - semantic_code_search：语义代码搜索（GraphQL）
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitLabClient } from "../gitlab-client.js";
import { GitLabGraphQLClient } from "../gitlab-graphql-client.js";
import { handleGitLabError } from "../errors.js";
import type { GitLabLabel, GitLabSearchResult } from "../types/gitlab-rest.js";
import type { CodeSnippetSearchResponse } from "../types/gitlab-graphql.js";

const SEMANTIC_CODE_SEARCH_QUERY = `
  query codeSnippetSearch(
    $projectPath: ID!
    $search: String!
    $after: String
    $first: Int
  ) {
    codeSnippetSearch(
      projectPath: $projectPath
      search: $search
      after: $after
      first: $first
    ) {
      nodes {
        filename
        projectPath
        ref
        startLine
        data
        blobPath
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export function registerSearchTools(
  server: McpServer,
  client: GitLabClient,
  graphqlClient: GitLabGraphQLClient
): void {
  server.registerTool(
    "search",
    {
      title: "搜索 GitLab 内容",
      description:
        "在 GitLab 中搜索内容，支持全局搜索、群组范围搜索和项目范围搜索",
      inputSchema: z.object({
        scope: z
          .enum([
            "projects",
            "issues",
            "merge_requests",
            "milestones",
            "snippet_titles",
            "wiki_blobs",
            "commits",
            "blobs",
            "notes",
            "users",
          ])
          .describe("搜索范围类型"),
        search: z.string().describe("搜索关键词"),
        project_id: z
          .string()
          .optional()
          .describe("限定在指定项目内搜索（优先于 group_id）"),
        group_id: z
          .string()
          .optional()
          .describe("限定在指定群组内搜索"),
        page: z.number().optional().describe("分页页码，默认 1"),
        per_page: z
          .number()
          .optional()
          .describe("每页数量，默认 20，最大 100"),
      }),
    },
    async ({ scope, search, project_id, group_id, page, per_page }) => {
      try {
        let path: string;
        if (project_id) {
          const encodedId = GitLabClient.encodeProjectId(project_id);
          path = `/projects/${encodedId}/search`;
        } else if (group_id) {
          const encodedId = GitLabClient.encodeProjectId(group_id);
          path = `/groups/${encodedId}/search`;
        } else {
          path = "/search";
        }

        const results = await client.get<GitLabSearchResult[]>(path, {
          scope,
          search,
          page,
          per_page,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "search_labels",
    {
      title: "搜索标签",
      description: "在 GitLab 项目或群组中搜索标签",
      inputSchema: z.object({
        project_id: z
          .string()
          .optional()
          .describe("项目 ID 或路径（与 group_id 二选一）"),
        group_id: z
          .string()
          .optional()
          .describe("群组 ID 或路径（与 project_id 二选一）"),
        search: z.string().optional().describe("搜索关键词，模糊匹配标签名称"),
        page: z.number().optional().describe("分页页码，默认 1"),
        per_page: z.number().optional().describe("每页数量，默认 20"),
      }),
    },
    async ({ project_id, group_id, search, page, per_page }) => {
      try {
        let path: string;
        if (project_id) {
          const encodedId = GitLabClient.encodeProjectId(project_id);
          path = `/projects/${encodedId}/labels`;
        } else if (group_id) {
          const encodedId = GitLabClient.encodeProjectId(group_id);
          path = `/groups/${encodedId}/labels`;
        } else {
          throw new Error(
            "必须提供 project_id 或 group_id"
          );
        }

        const labels = await client.get<GitLabLabel[]>(path, {
          search,
          page,
          per_page,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(labels, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "semantic_code_search",
    {
      title: "语义代码搜索",
      description:
        "使用 GitLab Duo 的语义搜索功能在项目中搜索代码（需要 GitLab Ultimate + Duo Enterprise）",
      inputSchema: z.object({
        project_path: z
          .string()
          .describe("项目的完整路径（如 my-group/my-project）"),
        search: z.string().describe("自然语言或代码搜索查询"),
        after: z.string().optional().describe("分页游标"),
        first: z.number().optional().describe("返回记录数，默认 20"),
      }),
    },
    async ({ project_path, search, after, first }) => {
      try {
        const result = await graphqlClient.query<CodeSnippetSearchResponse>(
          SEMANTIC_CODE_SEARCH_QUERY,
          {
            projectPath: project_path,
            search,
            after,
            first,
          }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.codeSnippetSearch, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );
}
