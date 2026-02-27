/**
 * GitLabMCPServer 类
 * 创建并配置 MCP Server 实例，注册所有工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GitLabClient } from "./gitlab-client.js";
import { GitLabGraphQLClient } from "./gitlab-graphql-client.js";
import { registerAllTools } from "./tools/index.js";
import type { Config } from "./config.js";

export function createServer(config: Config): McpServer {
  const server = new McpServer(
    {
      name: "mcp-server-gitlab",
      version: "1.0.0",
    }
  );

  const restClient = new GitLabClient(config.gitlabUrl, config.gitlabToken);
  const graphqlClient = new GitLabGraphQLClient(
    config.gitlabUrl,
    config.gitlabToken
  );

  registerAllTools(server, restClient, graphqlClient);

  return server;
}
