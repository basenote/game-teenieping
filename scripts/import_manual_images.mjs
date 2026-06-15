import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const processedPath = path.join(rootDir, "data", "processed", "characters.json");
const manualImportsDir = path.join(rootDir, "data", "manual", "imports");
const assetsDir = path.join(rootDir, "web", "assets", "images", "characters");

const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

async function loadCharacters() {
  const text = await readFile(processedPath, "utf8");
  return JSON.parse(text);
}

async function listSupportedFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => supportedExtensions.has(path.extname(name).toLowerCase()));
  } catch {
    return [];
  }
}

function normalizedBaseName(fileName) {
  return path.basename(fileName, path.extname(fileName)).replace(/\s+/g, "");
}

async function main() {
  await mkdir(manualImportsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const characters = await loadCharacters();
  const candidates = [
    ...(await listSupportedFiles(rootDir)).map((name) => ({ dir: rootDir, name })),
    ...(await listSupportedFiles(manualImportsDir)).map((name) => ({ dir: manualImportsDir, name }))
  ];

  if (candidates.length === 0) {
    console.log("No manual image files found.");
    console.log("Place files like '하츄핑.webp' in the project root or data/manual/imports/.");
    return;
  }

  const byName = new Map(
    characters.map((character) => [character.nameKo.replace(/\s+/g, ""), character])
  );

  let importedCount = 0;

  for (const candidate of candidates) {
    const key = normalizedBaseName(candidate.name);
    const character = byName.get(key);

    if (!character) {
      console.log(`Skipping ${candidate.name}: no matching character name`);
      continue;
    }

    const extension = path.extname(candidate.name).toLowerCase();
    const sourcePath = path.join(candidate.dir, candidate.name);
    const targetName = `${character.id}${extension}`;
    const targetPath = path.join(assetsDir, targetName);

    await copyFile(sourcePath, targetPath);
    importedCount += 1;
    console.log(`Imported ${candidate.name} -> web/assets/images/characters/${targetName}`);
  }

  console.log(`Imported ${importedCount} manual image file(s).`);
  console.log("Run 'node scripts/build_dataset.mjs' next to link them into the game data.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
