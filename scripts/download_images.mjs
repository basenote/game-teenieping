import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const processedPath = path.join(rootDir, "data", "processed", "characters.json");
const assetsDir = path.join(rootDir, "web", "assets", "images", "characters");

function extensionFromContentType(contentType) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "bin";
}

async function loadCharacters() {
  const text = await readFile(processedPath, "utf8");
  return JSON.parse(text);
}

async function downloadImage(character) {
  if (!character.sourceImageUrl) {
    console.log(`Skipping ${character.nameKo}: no sourceImageUrl`);
    return;
  }

  const response = await fetch(character.sourceImageUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TeeniepingQuizBot/0.1; +local)",
      referer: "https://namu.wiki/"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const extension = extensionFromContentType(contentType);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const targetPath = path.join(assetsDir, `${character.id}.${extension}`);

  await writeFile(targetPath, bytes);
  console.log(`Saved ${character.nameKo} -> web/assets/images/characters/${character.id}.${extension}`);
}

async function main() {
  await mkdir(assetsDir, { recursive: true });
  const characters = await loadCharacters();

  for (const character of characters) {
    try {
      await downloadImage(character);
    } catch (error) {
      console.log(`Failed ${character.nameKo}: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
