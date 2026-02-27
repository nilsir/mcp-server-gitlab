/**
 * server-info 工具测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerServerInfoTools } from "../../src/tools/server-info.js";

describe("server-info 工具", () => {
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    server = new McpServer({ name: "test", version: "1.0.0" });
    registerServerInfoTools(server);

    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  it("get_mcp_server_version 应返回版本信息", async () => {
    const result = await client.callTool({
      name: "get_mcp_server_version",
      arguments: {},
    });

    expect(result.content).toHaveLength(1);
    const content = result.content[0] as { type: string; text: string };
    expect(content.type).toBe("text");

    const data = JSON.parse(content.text) as { version: string; name: string };
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("name", "mcp-server-gitlab");
    expect(typeof data.version).toBe("string");
  });
});
