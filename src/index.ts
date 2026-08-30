// 第一行：加载 .env 环境变量
import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as fs from "fs/promises";
import * as path from "path";

// ========== 基础配置校验 ==========
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("❌ 启动失败：请在 .env 文件中配置 GITHUB_TOKEN");
  process.exit(1);
}

// ========== 创建 MCP 服务实例 ==========
const server = new McpServer({
  name: "frontend-code-review-mcp",
  version: "1.0.0",
  description: "前端代码自动化评审工具集，支持PR变更拉取、代码规范检查、结构化评审意见生成"
});

// ==================== 工具 1：健康检查 ====================
server.registerTool(
  "ping",
  {
    description: "健康检查，测试MCP服务是否正常运行",
    inputSchema: z.object({})
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "✅ 前端代码评审 MCP 服务运行正常"
        }
      ]
    };
  }
);

// ==================== 工具 2：获取 PR 变更 Diff ====================
server.registerTool(
  "get_pr_diff",
  {
    description: "获取 GitHub PR 的完整变更代码 Diff，用于代码评审分析",
    inputSchema: z.object({
      repo: z.string().describe("仓库地址，格式：owner/repo，例如：username/my-project"),
      prNumber: z.number().describe("PR 编号，例如：12")
    })
  },
  async ({ repo, prNumber }) => {
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${repo}/pulls/${prNumber}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3.diff"
          }
        }
      );

      return {
        content: [
          {
            type: "text",
            text: `## PR #${prNumber} 变更内容\n\n\`\`\`diff\n${data}\n\`\`\``
          }
        ]
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `❌ 获取 PR Diff 失败：${errMsg}`
          }
        ],
        isError: true
      };
    }
  }
);

// ==================== 工具 3：读取本地文件 ====================
server.registerTool(
  "read_file",
  {
    description: "读取本地项目中指定文件的完整代码，获取完整上下文用于评审",
    inputSchema: z.object({
      filePath: z.string().describe("文件相对路径，例如：src/App.tsx"),
      baseDir: z.string().optional().describe("项目根目录，默认当前工作目录")
    })
  },
  async ({ filePath, baseDir }) => {
    try {
      const rootDir = baseDir || process.cwd();
      const fullPath = path.join(rootDir, filePath);
      const content = await fs.readFile(fullPath, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `文件：${filePath}\n\n\`\`\`tsx\n${content}\n\`\`\``
          }
        ]
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `❌ 读取文件失败：${errMsg}`
          }
        ],
        isError: true
      };
    }
  }
);

// ==================== 工具 4：前端代码规范检查 ====================
server.registerTool(
  "frontend_lint_check",
  {
    description: "前端代码专项检查：React Hooks 规范、TypeScript 类型安全、基础性能与编码规范",
    inputSchema: z.object({
      filePath: z.string().describe("待检查的文件路径"),
      code: z.string().describe("待检查的完整代码内容")
    })
  },
  async ({ filePath, code }) => {
    const issues: string[] = [];

    // ===== 可在此处自定义扩展团队规范 =====
    // TypeScript 类型规范
    if (/\b:\s*any\b/.test(code)) {
      issues.push("- 🔴 错误：禁止使用 `any` 类型，请定义具体的类型");
    }

    // React Hooks 规范
    if (code.includes("useState") && !/import.*useState.*from.*react/.test(code)) {
      issues.push("- 🔴 错误：使用了 useState 但未从 react 模块导入");
    }
    if (/useEffect\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\},\s*\[\s*\]/.test(code)) {
      issues.push("- 🟡 警告：useEffect 空依赖数组，请确认是否遗漏依赖项，避免逻辑bug");
    }

    // 编码规范
    if (/\bvar\s+\w+/.test(code)) {
      issues.push("- 🟡 警告：禁止使用 var 声明变量，请使用 const / let");
    }
    if (/console\.log\(/.test(code) && !filePath.includes("test")) {
      issues.push("- 🔵 建议：移除业务代码中的 console.log，避免生产环境输出");
    }

    // 性能建议
    if (/setState\(.*\)[\s\S]*?setState\(/.test(code)) {
      issues.push("- 🟡 警告：连续多次 setState 调用，建议合并为一次状态更新，减少重渲染");
    }

    const result = issues.length === 0
      ? `✅ ${filePath} 未发现基础规范问题`
      : `## ${filePath} 前端规范检查结果\n${issues.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: result
        }
      ]
    };
  }
);

// ==================== 工具 5：生成结构化评审评论 ====================
server.registerTool(
  "generate_review_comment",
  {
    description: "生成标准化的代码评审评论，可直接提交到GitHub PR对应代码行",
    inputSchema: z.object({
      filePath: z.string().describe("问题所在的文件路径"),
      line: z.number().describe("问题所在的行号"),
      level: z.enum(["error", "warning", "info"]).describe("问题严重等级"),
      content: z.string().describe("评审意见的具体内容"),
      suggestion: z.string().optional().describe("可选：修复建议的代码片段")
    })
  },
  async ({ filePath, line, level, content, suggestion }) => {
    const levelMap = {
      error: "🔴 错误",
      warning: "🟡 警告",
      info: "🔵 建议"
    };

    const commentBody = `
${levelMap[level]} **${filePath}:${line}**

${content}
${suggestion ? `\n**修改建议：**
\`\`\`tsx
${suggestion}
\`\`\`` : ""}
    `.trim();

    return {
      content: [
        { type: "text", text: commentBody }
      ],
      structuredContent: {
        path: filePath,
        line,
        level,
        body: content,
        suggestion: suggestion || null
      }
    };
  }
);

// ========== 启动服务（stdio 模式） ==========
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ 前端代码评审 MCP Server 已启动，等待客户端连接...");
}

main().catch((err) => {
  console.error("❌ MCP 服务启动失败：", err);
  process.exit(1);
});
