import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { ESLint } from "eslint";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export function registerFrontendLintCheckTool(server: McpServer) {
  server.registerTool(
    "frontend_lint_check",
    {
      description: "前端代码专项检查：React Hooks规范、TypeScript类型安全、ESLint编码规范",
      inputSchema: z.object({
        filePath: z.string().describe("待检查的文件路径"),
        code: z.string().describe("待检查的完整代码内容")
      })
    },
    async ({ filePath, code }) => {
      const issues: string[] = [];

      // ========== 第一部分：自定义团队规范规则 ==========
      // TypeScript 类型规范
      if (/\b:\s*any\b/.test(code)) {
        issues.push("- 🔴 错误【自定义规范】：禁止使用 `any` 类型，请定义具体的类型");
      }

      // React Hooks 规范
      if (code.includes("useState") && !/import.*useState.*from.*react/.test(code)) {
        issues.push("- 🔴 错误【自定义规范】：使用了 useState 但未从 react 模块导入");
      }
      if (/useEffect\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\},\s*\[\s*\]/.test(code)) {
        issues.push("- 🟡 警告【自定义规范】：useEffect 空依赖数组，请确认是否遗漏依赖项，避免逻辑bug");
      }

      // 基础编码规范
      if (/\bvar\s+\w+/.test(code)) {
        issues.push("- 🟡 警告【自定义规范】：禁止使用 var 声明变量，请使用 const / let");
      }
      if (/console\.log\(/.test(code) && !filePath.includes("test")) {
        issues.push("- 🔵 建议【自定义规范】：移除业务代码中的 console.log，避免生产环境输出");
      }

      // ========== 第二部分：ESLint 标准检查 ==========
      try {
        const eslint = new ESLint({
          overrideConfigFile: true, // 禁用本地配置文件，仅使用下方配置
          baseConfig: {
            files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
            languageOptions: {
              ecmaVersion: 2022,
              sourceType: "module",
              parser: tsParser,
              parserOptions: {
                ecmaFeatures: { jsx: true }
              }
            },
            plugins: {
              "@typescript-eslint": tsPlugin
            },
            rules: {
              "no-unused-vars": "off",
              "@typescript-eslint/no-unused-vars": "warn",
              "no-console": "warn",
              "@typescript-eslint/no-explicit-any": "error",
              "prefer-const": "warn",
              "no-var": "error",
              "react-hooks/exhaustive-deps": "off"
            }
          }
        });

        const results = await eslint.lintText(code, { filePath });
        for (const result of results) {
          for (const message of result.messages) {
            const level = message.severity === 2 ? "🔴 错误" : "🟡 警告";
            const ruleId = message.ruleId || "syntax";
            issues.push(`- ${level} [ESLint ${ruleId}] 第${message.line}行：${message.message}`);
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        issues.push(`- ⚠️ ESLint 检查执行异常：${errMsg}`);
      }

      // ========== 统一返回结果 ==========
      const resultText = issues.length === 0
        ? `✅ ${filePath} 未发现规范问题`
        : `## ${filePath} 前端规范检查结果\n${issues.join("\n")}`;

      return {
        content: [{ type: "text", text: resultText }]
      };
    }
  );
}
