import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { config } from "./config";

// 引入所有工具注册函数
import { registerPingTool } from "./tools/ping.tool";
import { registerGetPrDiffTool } from "./tools/get-pr-diff.tool";
import { registerReadFileTool } from "./tools/read-file.tool";
import { registerFrontendLintCheckTool } from "./tools/frontend-lint-check.tool";
import { registerGenerateReviewCommentTool } from "./tools/generate-review-comment.tool";

// ========== 全局唯一服务实例 ==========
const server = new McpServer({
  name: config.SERVICE_NAME,
  version: config.SERVICE_VERSION,
  description: config.SERVICE_DESCRIPTION
});

// ========== 批量注册所有工具 ==========
registerPingTool(server);
registerGetPrDiffTool(server);
registerReadFileTool(server);
registerFrontendLintCheckTool(server);
registerGenerateReviewCommentTool(server);

// ========== 启动服务 ==========
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ ${config.SERVICE_NAME} 已启动，等待客户端连接...`);
}

main().catch((err) => {
  console.error("❌ MCP 服务启动失败：", err);
  process.exit(1);
});
