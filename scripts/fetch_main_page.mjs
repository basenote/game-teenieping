import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const rawPagesDir = path.join(rootDir, "data", "raw", "pages");
const targetPath = path.join(rawPagesDir, "teenieping-main.html");
const sourcePage = "https://namu.wiki/w/%ED%8B%B0%EB%8B%88%ED%95%91";

async function main() {
  await mkdir(rawPagesDir, { recursive: true });

  const response = await fetch(sourcePage, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TeeniepingQuizBot/0.1; +local)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch main page: ${response.status}`);
  }

  const html = await response.text();
  await writeFile(targetPath, html, "utf8");
  console.log(`Saved teenieping main page -> ${path.relative(rootDir, targetPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
