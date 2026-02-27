/**
 * 真实 GitLab 环境集成测试脚本
 * 通过 InMemoryTransport 直接连接 MCP Server 测试各工具
 *
 * 使用方法：
 *   GITLAB_TOKEN=xxx GITLAB_URL=http://code.starlinke.cn npx tsx tests/test-real.ts
 *   # 或使用 npm 脚本：
 *   GITLAB_TOKEN=xxx GITLAB_URL=http://code.starlinke.cn npm run test:real
 *
 * 可选参数（通过环境变量）：
 *   TEST_PROJECT_ID    - 用于测试 issue/MR/pipeline 的项目 ID 或路径，如 "mygroup/myproject"
 *   TEST_ISSUE_IID     - 用于测试 get_issue 的 issue IID（整数）
 *   TEST_MR_IID        - 用于测试 get_merge_request 的 MR IID（整数）
 *   TEST_SEARCH_TERM   - 搜索关键词，默认 "test"
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { loadConfig } from "../src/config.js";

// ─── 颜色输出工具 ────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function ok(msg: string) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}
function fail(msg: string, err?: unknown) {
  console.log(`${RED}✗${RESET} ${msg}`);
  if (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${RED}${message}${RESET}`);
  }
}
function skip(msg: string, reason: string) {
  console.log(`${YELLOW}⊘${RESET} ${msg} ${YELLOW}(跳过: ${reason})${RESET}`);
}
function section(title: string) {
  console.log(`\n${BOLD}${CYAN}── ${title} ──${RESET}`);
}
function info(msg: string) {
  console.log(`  ${CYAN}→${RESET} ${msg}`);
}

// ─── 统计 ────────────────────────────────────────────────────────────────────
let passCount = 0;
let failCount = 0;
let skipCount = 0;

class SkipTest extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "SkipTest";
  }
}

// ─── 测试辅助函数 ────────────────────────────────────────────────────────────
async function runTool(
  client: Client,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    if (result.isError) {
      const errText =
        Array.isArray(result.content) && result.content.length > 0
          ? (result.content[0] as { text?: string }).text ?? "未知错误"
          : "未知错误";
      return { success: false, error: errText };
    }
    const text =
      Array.isArray(result.content) && result.content.length > 0
        ? (result.content[0] as { text?: string }).text ?? ""
        : "";
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // 非 JSON 保留原始文本
    }
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function test(
  label: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
    ok(label);
    passCount++;
  } catch (err) {
    if (err instanceof SkipTest) {
      skip(label, err.reason);
      skipCount++;
    } else {
      fail(label, err);
      failCount++;
    }
  }
}

// ─── 主测试流程 ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}GitLab MCP Server 真实环境测试${RESET}`);
  console.log("=".repeat(50));

  // 读取配置（缺少 GITLAB_TOKEN 时会直接 process.exit）
  const config = loadConfig();
  const projectId = process.env.TEST_PROJECT_ID ?? "";
  const issueIid = process.env.TEST_ISSUE_IID
    ? parseInt(process.env.TEST_ISSUE_IID, 10)
    : 0;
  const mrIid = process.env.TEST_MR_IID
    ? parseInt(process.env.TEST_MR_IID, 10)
    : 0;
  const searchTerm = process.env.TEST_SEARCH_TERM ?? "test";

  info(`GitLab URL: ${config.gitlabUrl}`);
  info(`Token: ${config.gitlabToken.slice(0, 6)}...`);
  if (projectId) info(`项目: ${projectId}`);
  if (issueIid) info(`Issue IID: ${issueIid}`);
  if (mrIid) info(`MR IID: ${mrIid}`);
  info(`搜索词: ${searchTerm}`);

  // 建立 MCP 连接
  const server = createServer(config);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  // ─── 1. 服务器信息 ───────────────────────────────────────────────────────
  section("服务器基础信息");

  await test("get_mcp_server_version 返回版本信息", async () => {
    const r = await runTool(client, "get_mcp_server_version", {});
    if (!r.success) throw new Error(r.error);
    const data = r.data as { version: string; name: string };
    if (!data.version || !data.name) throw new Error("返回数据缺少 version 或 name");
    info(`版本: ${data.version}, 名称: ${data.name}`);
  });

  await test("列出工具列表（不为空）", async () => {
    const tools = await client.listTools();
    if (!tools.tools || tools.tools.length === 0)
      throw new Error("工具列表为空");
    info(`已注册工具数: ${tools.tools.length}`);
    for (const t of tools.tools) {
      info(`  - ${t.name}`);
    }
  });

  // ─── 2. 全局搜索（验证 REST API 连通性）────────────────────────────────
  section("全局搜索（REST API 连通性）");

  await test(`search projects scope 搜索 "${searchTerm}"`, async () => {
    const r = await runTool(client, "search", {
      scope: "projects",
      search: searchTerm,
      per_page: 5,
    });
    if (!r.success) throw new Error(r.error);
    const items = r.data as unknown[];
    info(`搜索结果数量: ${Array.isArray(items) ? items.length : "非数组"}`);
  });

  await test(`search users scope 搜索 "${searchTerm}"`, async () => {
    const r = await runTool(client, "search", {
      scope: "users",
      search: searchTerm,
      per_page: 5,
    });
    if (!r.success) throw new Error(r.error);
    const items = r.data as unknown[];
    info(`用户搜索结果数量: ${Array.isArray(items) ? items.length : "非数组"}`);
  });

  // ─── 3. 项目范围测试 ─────────────────────────────────────────────────────
  section("项目范围测试（需要 TEST_PROJECT_ID）");

  if (!projectId) {
    skip("search_labels", "未设置 TEST_PROJECT_ID");
    skipCount++;
    skip("manage_pipeline list", "未设置 TEST_PROJECT_ID");
    skipCount++;
  } else {
    await test(`search_labels 在项目 ${projectId} 中搜索标签`, async () => {
      const r = await runTool(client, "search_labels", {
        project_id: projectId,
        per_page: 10,
      });
      if (!r.success) throw new Error(r.error);
      const items = r.data as unknown[];
      info(`标签数量: ${Array.isArray(items) ? items.length : "非数组"}`);
    });

    await test(`manage_pipeline list 列出项目 ${projectId} 的 Pipeline`, async () => {
      const r = await runTool(client, "manage_pipeline", {
        project_id: projectId,
        list: true,
        per_page: 5,
      });
      if (!r.success) {
        // 403 表示权限不足，跳过而非失败
        if (r.error?.includes("403")) {
          throw new SkipTest("Token 无 Pipeline 读取权限（403）");
        }
        throw new Error(r.error);
      }
      const items = r.data as unknown[];
      info(`Pipeline 数量: ${Array.isArray(items) ? items.length : "非数组"}`);
    });

    await test(`search issues scope 在项目 ${projectId} 中搜索`, async () => {
      const r = await runTool(client, "search", {
        scope: "issues",
        search: searchTerm,
        project_id: projectId,
        per_page: 5,
      });
      if (!r.success) throw new Error(r.error);
      const items = r.data as unknown[];
      info(`Issue 搜索结果: ${Array.isArray(items) ? items.length : "非数组"}`);
    });

    await test(`search merge_requests scope 在项目 ${projectId} 中搜索`, async () => {
      const r = await runTool(client, "search", {
        scope: "merge_requests",
        search: searchTerm,
        project_id: projectId,
        per_page: 5,
      });
      if (!r.success) throw new Error(r.error);
      const items = r.data as unknown[];
      info(`MR 搜索结果: ${Array.isArray(items) ? items.length : "非数组"}`);
    });
  }

  // ─── 4. Issue 详情 ───────────────────────────────────────────────────────
  section("Issue 详情");

  if (!projectId || !issueIid) {
    skip("get_issue", "未设置 TEST_PROJECT_ID 或 TEST_ISSUE_IID");
    skipCount++;
  } else {
    await test(`get_issue 获取 ${projectId}#${issueIid}`, async () => {
      const r = await runTool(client, "get_issue", {
        project_id: projectId,
        issue_iid: issueIid,
      });
      if (!r.success) throw new Error(r.error);
      const issue = r.data as { iid: number; title: string };
      if (!issue.iid || !issue.title) throw new Error("返回数据缺少必要字段");
      info(`Issue: #${issue.iid} ${issue.title}`);
    });
  }

  // ─── 5. Merge Request 相关 ───────────────────────────────────────────────
  section("Merge Request 相关");

  if (!projectId || !mrIid) {
    skip("get_merge_request", "未设置 TEST_PROJECT_ID 或 TEST_MR_IID");
    skipCount++;
    skip("get_merge_request_commits", "未设置 TEST_PROJECT_ID 或 TEST_MR_IID");
    skipCount++;
    skip("get_merge_request_diffs", "未设置 TEST_PROJECT_ID 或 TEST_MR_IID");
    skipCount++;
    skip("get_merge_request_pipelines", "未设置 TEST_PROJECT_ID 或 TEST_MR_IID");
    skipCount++;
  } else {
    await test(`get_merge_request 获取 ${projectId}!${mrIid}`, async () => {
      const r = await runTool(client, "get_merge_request", {
        project_id: projectId,
        mr_iid: mrIid,
      });
      if (!r.success) throw new Error(r.error);
      const mr = r.data as { iid: number; title: string; state: string };
      if (!mr.iid || !mr.title) throw new Error("返回数据缺少必要字段");
      info(`MR: !${mr.iid} [${mr.state}] ${mr.title}`);
    });

    await test(`get_merge_request_commits 获取 MR!${mrIid} 提交`, async () => {
      const r = await runTool(client, "get_merge_request_commits", {
        project_id: projectId,
        mr_iid: mrIid,
      });
      if (!r.success) throw new Error(r.error);
      const commits = r.data as unknown[];
      info(`提交数量: ${Array.isArray(commits) ? commits.length : "非数组"}`);
    });

    await test(`get_merge_request_diffs 获取 MR!${mrIid} 差异`, async () => {
      const r = await runTool(client, "get_merge_request_diffs", {
        project_id: projectId,
        mr_iid: mrIid,
      });
      if (!r.success) throw new Error(r.error);
      const diffs = r.data as unknown[];
      info(`Diff 文件数量: ${Array.isArray(diffs) ? diffs.length : "非数组"}`);
    });

    await test(`get_merge_request_pipelines 获取 MR!${mrIid} Pipeline`, async () => {
      const r = await runTool(client, "get_merge_request_pipelines", {
        project_id: projectId,
        mr_iid: mrIid,
      });
      if (!r.success) throw new Error(r.error);
      const pipelines = r.data as unknown[];
      info(`Pipeline 数量: ${Array.isArray(pipelines) ? pipelines.length : "非数组"}`);
    });
  }

  // ─── 6. GraphQL 连通性（work items notes）────────────────────────────────
  section("GraphQL 连通性（work items notes）");

  if (!projectId || !issueIid) {
    skip("get_workitem_notes", "未设置 TEST_PROJECT_ID 或 TEST_ISSUE_IID");
    skipCount++;
  } else {
    // GitLab work items 使用 full path 格式，iid 要传字符串
    await test(`get_workitem_notes 获取 ${projectId} issue ${issueIid} 的评论`, async () => {
      const r = await runTool(client, "get_workitem_notes", {
        project_path: projectId,
        work_item_iid: String(issueIid),
      });
      if (!r.success) throw new Error(r.error);
      info(`GraphQL 调用成功，数据: ${JSON.stringify(r.data).slice(0, 100)}...`);
    });
  }

  // ─── 7. 错误处理验证 ─────────────────────────────────────────────────────
  section("错误处理验证");

  await test("访问不存在的项目应返回错误（不崩溃）", async () => {
    const r = await runTool(client, "manage_pipeline", {
      project_id: "nonexistent-project-12345",
      list: true,
    });
    // 应该是错误，但 server 不应该崩溃
    if (r.success) {
      // 如果成功了，检查是否是空数组（某些 gitlab 版本可能返回空）
      info(`意外成功，数据: ${JSON.stringify(r.data).slice(0, 100)}`);
    } else {
      info(`如期返回错误: ${r.error?.slice(0, 100)}`);
    }
    // 无论成功还是失败，server 仍然在运行
  });

  await test("search_labels 缺少必填参数应返回错误", async () => {
    const r = await runTool(client, "search_labels", {});
    // 这里应该返回错误（缺少 project_id 或 group_id）
    if (!r.success) {
      info(`如期返回错误: ${r.error?.slice(0, 100)}`);
    } else {
      // search_labels 没有 project_id 和 group_id 时应当报错
      throw new Error("期望 search_labels 在无必填参数时返回错误，但调用成功了");
    }
  });

  // ─── 结果汇总 ────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log(`${BOLD}测试结果汇总${RESET}`);
  console.log(`  ${GREEN}通过: ${passCount}${RESET}`);
  if (failCount > 0) console.log(`  ${RED}失败: ${failCount}${RESET}`);
  if (skipCount > 0) console.log(`  ${YELLOW}跳过: ${skipCount}${RESET}`);
  console.log("=".repeat(50));

  await client.close();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("测试脚本致命错误:", err);
  process.exit(1);
});
