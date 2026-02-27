/**
 * Merge Request 相关工具
 * - create_merge_request：创建 MR
 * - get_merge_request：获取 MR 详情
 * - get_merge_request_commits：获取 MR 的提交列表
 * - get_merge_request_diffs：获取 MR 的差异
 * - get_merge_request_pipelines：获取 MR 关联的 Pipeline 列表
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitLabClient } from "../gitlab-client.js";
import { handleGitLabError } from "../errors.js";
import type {
  GitLabMergeRequest,
  GitLabCommit,
  GitLabDiff,
  GitLabPipeline,
} from "../types/gitlab-rest.js";

export function registerMergeRequestTools(
  server: McpServer,
  client: GitLabClient
): void {
  server.registerTool(
    "create_merge_request",
    {
      title: "创建 Merge Request",
      description: "在 GitLab 项目中创建新的 Merge Request",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        title: z.string().describe("MR 标题"),
        source_branch: z.string().describe("源分支名称"),
        target_branch: z.string().describe("目标分支名称"),
        description: z.string().optional().describe("MR 描述（支持 Markdown）"),
        assignee_ids: z
          .array(z.number())
          .optional()
          .describe("指派人的用户 ID 列表"),
        labels: z.string().optional().describe("标签列表，逗号分隔"),
        milestone_id: z.number().optional().describe("里程碑 ID"),
        remove_source_branch: z
          .boolean()
          .optional()
          .describe("合并后是否删除源分支"),
        squash: z.boolean().optional().describe("是否将提交压缩合并"),
      }),
    },
    async ({
      project_id,
      title,
      source_branch,
      target_branch,
      description,
      assignee_ids,
      labels,
      milestone_id,
      remove_source_branch,
      squash,
    }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const mr = await client.post<GitLabMergeRequest>(
          `/projects/${encodedId}/merge_requests`,
          {
            title,
            source_branch,
            target_branch,
            description,
            assignee_ids,
            labels,
            milestone_id,
            remove_source_branch,
            squash,
          }
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(mr, null, 2) }],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "get_merge_request",
    {
      title: "获取 Merge Request 详情",
      description: "获取 GitLab 项目中指定 Merge Request 的详细信息",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        mr_iid: z.number().describe("MR 在项目内的 IID"),
      }),
    },
    async ({ project_id, mr_iid }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const mr = await client.get<GitLabMergeRequest>(
          `/projects/${encodedId}/merge_requests/${mr_iid}`
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(mr, null, 2) }],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "get_merge_request_commits",
    {
      title: "获取 MR 提交列表",
      description: "获取 Merge Request 包含的所有提交",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        mr_iid: z.number().describe("MR 在项目内的 IID"),
      }),
    },
    async ({ project_id, mr_iid }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const commits = await client.get<GitLabCommit[]>(
          `/projects/${encodedId}/merge_requests/${mr_iid}/commits`
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(commits, null, 2) },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "get_merge_request_diffs",
    {
      title: "获取 MR 差异",
      description: "获取 Merge Request 的文件差异（diffs）",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        mr_iid: z.number().describe("MR 在项目内的 IID"),
        unidiff: z
          .boolean()
          .optional()
          .describe("是否返回 unidiff 格式（默认 false）"),
      }),
    },
    async ({ project_id, mr_iid, unidiff }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const diffs = await client.get<GitLabDiff[]>(
          `/projects/${encodedId}/merge_requests/${mr_iid}/diffs`,
          { unidiff }
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(diffs, null, 2) },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "get_merge_request_pipelines",
    {
      title: "获取 MR 关联的 Pipeline 列表",
      description: "获取与 Merge Request 关联的所有 Pipeline",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        mr_iid: z.number().describe("MR 在项目内的 IID"),
      }),
    },
    async ({ project_id, mr_iid }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const pipelines = await client.get<GitLabPipeline[]>(
          `/projects/${encodedId}/merge_requests/${mr_iid}/pipelines`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(pipelines, null, 2),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );
}
