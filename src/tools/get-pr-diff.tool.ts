import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import axios from "axios";
import { config } from "../config";

export function registerGetPrDiffTool(server: McpServer) {
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
              Authorization: `Bearer ${config.GITHUB_TOKEN}`,
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
          content: [{ type: "text", text: `❌ 获取 PR Diff 失败：${errMsg}` }],
          isError: true
        };
      }
    }
  );
}
