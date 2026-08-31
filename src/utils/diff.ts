/**
 * 解析 GitHub Diff 文本，提取每个文件的新增代码内容
 */
export function parseDiffToFiles(diff: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const fileBlocks = diff.split(/^diff --git a\/.* b\/(.*)$/m);

  for (let i = 1; i < fileBlocks.length; i += 2) {
    const filePath = fileBlocks[i].trim();
    const block = fileBlocks[i + 1];

    const lines = block.split("\n")
      .filter(line => line.startsWith("+") && !line.startsWith("+++"))
      .map(line => line.slice(1))
      .join("\n");

    if (filePath && lines) {
      files.push({ path: filePath, content: lines });
    }
  }

  return files;
}
