# GitLab MCP Server

通过 [MCP（Model Context Protocol）](https://modelcontextprotocol.io) 协议让 Claude 操作 GitLab API 的服务器。

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.12.0-purple)

---

## 功能

共 15 个工具，覆盖 GitLab 核心操作：

| 分类 | 工具 | 说明 |
|------|------|------|
| 服务器信息 | `get_mcp_server_version` | 返回服务器版本信息 |
| Issues | `create_issue` | 创建 Issue |
| Issues | `get_issue` | 获取 Issue 详情 |
| Merge Requests | `create_merge_request` | 创建 MR |
| Merge Requests | `get_merge_request` | 获取 MR 详情 |
| Merge Requests | `get_merge_request_commits` | 获取 MR 提交列表 |
| Merge Requests | `get_merge_request_diffs` | 获取 MR 差异 |
| Merge Requests | `get_merge_request_pipelines` | 获取 MR 关联 Pipeline |
| Pipelines | `get_pipeline_jobs` | 获取 Pipeline Job 列表 |
| Pipelines | `manage_pipeline` | 列出/创建/重试/取消/删除 Pipeline |
| 工作项 | `create_workitem_note` | 为工作项创建评论（GraphQL） |
| 工作项 | `get_workitem_notes` | 获取工作项评论列表（GraphQL） |
| 搜索 | `search` | 全局/群组/项目搜索 |
| 搜索 | `search_labels` | 搜索标签 |
| 搜索 | `semantic_code_search` | 语义代码搜索（需 GitLab Duo Enterprise） |

---

## 环境要求

- Node.js >= 18.0.0
- GitLab Personal Access Token（需要 `api` scope）

---

## 安装与配置

### 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GITLAB_TOKEN` | 是 | GitLab Personal Access Token |
| `GITLAB_URL` | 否 | GitLab 实例地址，默认 `https://gitlab.com` |

### 方式一：npx（推荐，无需本地安装）

**Claude Code 命令行添加：**

```bash
claude mcp add --scope project gitlab -- npx @nilsir/mcp-server-gitlab
```

**或手动配置 `.mcp.json`：**

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["@nilsir/mcp-server-gitlab"],
      "env": {
        "GITLAB_TOKEN": "your_token_here",
        "GITLAB_URL": "https://gitlab.example.com"
      }
    }
  }
}
```

### 方式二：从源码构建

```bash
git clone https://github.com/nilsir/mcp-server-gitlab.git
cd mcp-server-gitlab
npm install && npm run build
```

**Claude Code 命令行添加：**

```bash
claude mcp add --scope project gitlab -- node /path/to/dist/index.js
```

**或手动配置 `.mcp.json`：**

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["/path/to/mcp-server-gitlab/dist/index.js"],
      "env": {
        "GITLAB_TOKEN": "your_token_here",
        "GITLAB_URL": "https://gitlab.example.com"
      }
    }
  }
}
```

---

## 开发

```bash
# 安装依赖
npm install

# 运行测试（监听模式）
npm test

# 单次运行测试（37 个测试）
npm run test:run

# 编译 TypeScript
npm run build

# 开发模式（无需编译，直接运行 TypeScript）
npm run dev

# 本地调试（使用 MCP Inspector）
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 技术栈

- **运行时**：TypeScript + Node.js (ESM)
- **MCP SDK**：`@modelcontextprotocol/sdk` ^1.12.0
- **参数校验**：Zod
- **测试框架**：Vitest
- **HTTP 客户端**：原生 `fetch`（无额外依赖）

---

## License

MIT
