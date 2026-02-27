/**
 * Issue 相关工具
 * - create_issue：创建 Issue
 * - get_issue：获取 Issue 详情
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitLabClient } from "../gitlab-client.js";
import { handleGitLabError } from "../errors.js";
import type { GitLabIssue } from "../types/gitlab-rest.js";

export function registerIssueTools(server: McpServer, client: GitLabClient): void {
  server.registerTool(
    "create_issue",
    {
      title: "创建 Issue",
      description: "在 GitLab 项目中创建新的 Issue",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        title: z.string().describe("Issue 标题"),
        description: z.string().optional().describe("Issue 描述（支持 Markdown）"),
        labels: z.string().optional().describe("标签列表，逗号分隔"),
        assignee_ids: z
          .array(z.number())
          .optional()
          .describe("指派人的用户 ID 列表"),
        milestone_id: z.number().optional().describe("里程碑 ID"),
        due_date: z
          .string()
          .optional()
          .describe("截止日期，格式 YYYY-MM-DD"),
      }),
    },
    async ({ project_id, title, description, labels, assignee_ids, milestone_id, due_date }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const issue = await client.post<GitLabIssue>(
          `/projects/${encodedId}/issues`,
          {
            title,
            description,
            labels,
            assignee_ids,
            milestone_id,
            due_date,
          }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "get_issue",
    {
      title: "获取 Issue 详情",
      description: "获取 GitLab 项目中指定 Issue 的详细信息",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        issue_iid: z.number().describe("Issue 在项目内的 IID（不是全局 ID）"),
      }),
    },
    async ({ project_id, issue_iid }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const issue = await client.get<GitLabIssue>(
          `/projects/${encodedId}/issues/${issue_iid}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );
}
