import "dotenv/config";

export const config = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
  SERVICE_NAME: "frontend-code-review-mcp",
  SERVICE_VERSION: "1.0.0",
  SERVICE_DESCRIPTION: "前端代码自动化评审工具集，支持PR变更拉取、ESLint规范检查、结构化评审意见生成"
} as const;

// 启动前置校验
if (!config.GITHUB_TOKEN) {
  console.error("❌ 启动失败：请在 .env 文件中配置 GITHUB_TOKEN");
  process.exit(1);
}
