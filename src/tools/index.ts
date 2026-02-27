/**
 * 工具聚合注册模块
 * 将所有工具统一注册到 MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GitLabClient } from "../gitlab-client.js";
import { GitLabGraphQLClient } from "../gitlab-graphql-client.js";
import { registerServerInfoTools } from "./server-info.js";
import { registerIssueTools } from "./issues.js";
import { registerMergeRequestTools } from "./merge-requests.js";
import { registerPipelineTools } from "./pipelines.js";
import { registerWorkItemTools } from "./work-items.js";
import { registerSearchTools } from "./search.js";

export function registerAllTools(
  server: McpServer,
  restClient: GitLabClient,
  graphqlClient: GitLabGraphQLClient
): void {
  registerServerInfoTools(server);
  registerIssueTools(server, restClient);
  registerMergeRequestTools(server, restClient);
  registerPipelineTools(server, restClient);
  registerWorkItemTools(server, graphqlClient);
  registerSearchTools(server, restClient, graphqlClient);
}
