import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

export function registerReadFileTool(server: McpServer) {
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
          content: [{ type: "text", text: `❌ 读取文件失败：${errMsg}` }],
          isError: true
        };
      }
    }
  );
}
