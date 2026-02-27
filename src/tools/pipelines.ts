/**
 * Pipeline 相关工具
 * - get_pipeline_jobs：获取 Pipeline 的 Job 列表
 * - manage_pipeline：管理 Pipeline（列出/创建/重试/取消/删除/更新名称）
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitLabClient } from "../gitlab-client.js";
import { handleGitLabError } from "../errors.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { GitLabJob, GitLabPipeline } from "../types/gitlab-rest.js";

export function registerPipelineTools(
  server: McpServer,
  client: GitLabClient
): void {
  server.registerTool(
    "get_pipeline_jobs",
    {
      title: "获取 Pipeline Job 列表",
      description: "获取指定 Pipeline 下的所有 Job",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        pipeline_id: z.number().describe("Pipeline ID"),
        scope: z
          .enum(["created", "pending", "running", "failed", "success", "canceled", "skipped", "waiting_for_resource", "manual"])
          .optional()
          .describe("按状态过滤 Job"),
      }),
    },
    async ({ project_id, pipeline_id, scope }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);
        const jobs = await client.get<GitLabJob[]>(
          `/projects/${encodedId}/pipelines/${pipeline_id}/jobs`,
          { scope }
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(jobs, null, 2) }],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );

  server.registerTool(
    "manage_pipeline",
    {
      title: "管理 Pipeline",
      description:
        "多功能 Pipeline 管理工具，支持：列出 Pipeline（list=true）、创建 Pipeline（ref，无 pipeline_id）、重试（pipeline_id + retry=true）、取消（pipeline_id + cancel=true）、更新名称（pipeline_id + name）、删除（只有 pipeline_id）",
      inputSchema: z.object({
        project_id: z
          .string()
          .describe("项目 ID 或 namespace/project 格式的路径"),
        pipeline_id: z.number().optional().describe("Pipeline ID（操作现有 Pipeline 时必填）"),
        list: z.boolean().optional().describe("为 true 时列出项目的 Pipeline 列表"),
        ref: z.string().optional().describe("分支/标签名，创建 Pipeline 时必填"),
        retry: z.boolean().optional().describe("为 true 时重试指定的 Pipeline"),
        cancel: z.boolean().optional().describe("为 true 时取消指定的 Pipeline"),
        name: z.string().optional().describe("新名称，用于更新 Pipeline 名称"),
        status: z
          .enum(["running", "pending", "finished", "branches", "tags"])
          .optional()
          .describe("列出时按状态过滤"),
        page: z.number().optional().describe("分页页码，默认 1"),
        per_page: z.number().optional().describe("每页数量，默认 20，最大 100"),
      }),
    },
    async ({
      project_id,
      pipeline_id,
      list,
      ref,
      retry,
      cancel,
      name,
      status,
      page,
      per_page,
    }) => {
      try {
        const encodedId = GitLabClient.encodeProjectId(project_id);

        // 列出 Pipeline
        if (list) {
          const pipelines = await client.get<GitLabPipeline[]>(
            `/projects/${encodedId}/pipelines`,
            { status, page, per_page }
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(pipelines, null, 2),
              },
            ],
          };
        }

        // 创建 Pipeline
        if (ref && !pipeline_id) {
          const pipeline = await client.post<GitLabPipeline>(
            `/projects/${encodedId}/pipeline`,
            { ref }
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(pipeline, null, 2),
              },
            ],
          };
        }

        if (!pipeline_id) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "需要提供 pipeline_id 或设置 list=true 或提供 ref 以创建新 Pipeline"
          );
        }

        // 重试 Pipeline
        if (retry) {
          const pipeline = await client.post<GitLabPipeline>(
            `/projects/${encodedId}/pipelines/${pipeline_id}/retry`
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(pipeline, null, 2),
              },
            ],
          };
        }

        // 取消 Pipeline
        if (cancel) {
          const pipeline = await client.post<GitLabPipeline>(
            `/projects/${encodedId}/pipelines/${pipeline_id}/cancel`
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(pipeline, null, 2),
              },
            ],
          };
        }

        // 更新 Pipeline 名称
        if (name !== undefined) {
          const pipeline = await client.put<GitLabPipeline>(
            `/projects/${encodedId}/pipelines/${pipeline_id}/metadata`,
            { name }
          );
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(pipeline, null, 2),
              },
            ],
          };
        }

        // 删除 Pipeline（只有 pipeline_id）
        await client.delete<null>(
          `/projects/${encodedId}/pipelines/${pipeline_id}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: true, message: `Pipeline ${pipeline_id} 已删除` },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        handleGitLabError(error);
      }
    }
  );
}
