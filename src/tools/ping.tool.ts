import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { config } from "../config";

export function registerPingTool(server: McpServer) {
  server.registerTool(
    "ping",
    {
      description: "服务健康检查，返回服务状态与版本信息",
      inputSchema: z.object({})
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "ok",
              service: config.SERVICE_NAME,
              version: config.SERVICE_VERSION,
              timestamp: Date.now()
            }, null, 2)
          }
        ]
      };
    }
  );
}
