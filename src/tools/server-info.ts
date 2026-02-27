/**
 * 服务器信息工具
 * get_mcp_server_version：返回 MCP Server 版本号
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require(join(__dirname, "../../package.json")) as { version: string };
    return pkg.version;
  } catch {
    return "1.0.0";
  }
}

export function registerServerInfoTools(server: McpServer): void {
  server.registerTool(
    "get_mcp_server_version",
    {
      title: "获取 MCP Server 版本",
      description: "返回当前 GitLab MCP Server 的版本信息",
      inputSchema: z.object({}),
    },
    async () => {
      const version = getVersion();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ version, name: "mcp-server-gitlab" }, null, 2),
          },
        ],
      };
    }
  );
}
