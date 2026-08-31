import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export function registerGenerateReviewCommentTool(server: McpServer) {
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
        content: [{ type: "text", text: commentBody }],
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
}
