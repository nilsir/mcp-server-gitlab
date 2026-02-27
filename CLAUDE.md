# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 GitLab MCP (Model Context Protocol) Server 项目，使用 TypeScript + Node.js 实现，允许 Claude 通过 MCP 协议与 GitLab API 交互。

## 技术栈

- **运行时**: Node.js + TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **GitLab 客户端**: `@gitbeaker/rest` 或原生 `axios`
- **构建工具**: TypeScript compiler (`tsc`)
- **测试**: Vitest
- **包管理器**: pnpm（优先），其次 npm

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（直接运行 TypeScript，无需编译）
pnpm dev

# 构建生产版本
pnpm build

# 运行测试
pnpm test

# 运行单个测试文件
pnpm test src/tools/issues.test.ts

# 代码检查
pnpm lint

# 本地调试 MCP server（使用 MCP Inspector）
npx @modelcontextprotocol/inspector node dist/index.js
```

## 项目架构

```
src/
├── index.ts              # 服务器入口：初始化 MCP Server、连接 StdioTransport
├── server.ts             # GitLabMCPServer 类：注册所有 handlers
├── gitlab-client.ts      # GitLab API 客户端（封装认证、分页、错误处理）
├── tools/                # MCP Tools（工具调用，有副作用）
│   ├── index.ts          # 聚合导出所有工具定义
│   ├── projects.ts       # 项目相关工具
│   ├── issues.ts         # Issue 相关工具
│   ├── merge-requests.ts # MR 相关工具
│   ├── pipelines.ts      # CI/CD Pipeline 工具
│   └── users.ts          # 用户相关工具
├── resources/            # MCP Resources（只读数据，通过 URI 访问）
│   └── index.ts
└── types/                # TypeScript 类型定义
    └── gitlab.ts
```

## 核心架构决策

### MCP 传输层
使用 `StdioServerTransport`，通过标准输入输出与 MCP 客户端通信。服务器以子进程方式运行，不监听网络端口。

### 工具 vs 资源
- **Tools**（`src/tools/`）：有副作用的操作（创建 issue、合并 MR、触发 pipeline）
- **Resources**（`src/resources/`）：只读数据，通过 `gitlab://` URI scheme 访问

### GitLab 认证
通过环境变量注入，不在代码中硬编码：
- `GITLAB_TOKEN`：Personal Access Token 或 OAuth token
- `GITLAB_URL`：GitLab 实例 URL（默认 `https://gitlab.com/api/v4`）

### 错误处理
GitLab API 错误统一转换为 `McpError`，使用 `ErrorCode.InternalError` 或 `ErrorCode.InvalidParams`。

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GITLAB_TOKEN` | 是 | GitLab Personal Access Token |
| `GITLAB_URL` | 否 | GitLab API 基础 URL，默认 `https://gitlab.com/api/v4` |

## MCP Server 配置（.mcp.json）

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "GITLAB_TOKEN": "your_token_here",
        "GITLAB_URL": "https://your_domain/api/v4"
      }
    }
  }
}
```

## 工具命名规范

工具名使用 `动词_名词` 形式（snake_case），例如：
- `list_projects`、`get_project`、`create_project`
- `list_issues`、`get_issue`、`create_issue`、`update_issue`
- `list_merge_requests`、`create_merge_request`、`merge_merge_request`

## 对话、文档和注释语言

- 对话交流、文档：**中文**
- 代码注释：中文
- 变量/函数/类名：英文

## 发布流程

发布新版本时，请按以下步骤操作：

1. 更新 `package.json` 中的版本信息
2. 提交更改：`git add . && git commit -m "chore: release vX.X.X"`
3. 创建 Git 标签：`git tag -a vX.X.X -m "vX.X.X"`
4. 推送至 GitHub：`git push origin master --tags`
5. 创建 GitHub 发布：`gh release create vX.X.X --title "vX.X.X" --notes "..."`
6. 发布至 npm：`npm publish --access public`

**重要提示**：GitHub 和 npm 的版本必须始终保持同步。
