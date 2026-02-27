#!/usr/bin/env node
/**
 * 入口文件
 * 初始化配置，创建 MCP Server，通过 StdioTransport 运行
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
