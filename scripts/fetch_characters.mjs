import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultSeedPath = path.join(rootDir, "data", "seeds", "characters.seed.json");
const rawDir = path.join(rootDir, "data", "raw");
const rawPagesDir = path.join(rawDir, "pages");
const manifestPath = path.join(rawDir, "fetch-manifest.json");

async function ensureDirs() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(rawPagesDir, { recursive: true });
}

function timestamp() {
  return new Date().toISOString();
}

async function loadSeeds() {
  const arg = process.argv.find((entry) => entry.startsWith("--seed="));
  const seedPath = arg ? path.resolve(rootDir, arg.slice("--seed=".length)) : defaultSeedPath;
  const text = await readFile(seedPath, "utf8");
  return JSON.parse(text);
}

async function fetchPage(seed) {
  const response = await fetch(seed.sourcePage, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; TeeniepingQuizBot/0.1; +local)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${seed.sourcePage}: ${response.status}`);
  }

  const html = await response.text();
  const targetPath = path.join(rawPagesDir, `${seed.id}.html`);

  await writeFile(targetPath, html, "utf8");

  return {
    id: seed.id,
    nameKo: seed.nameKo,
    sourcePage: seed.sourcePage,
    savedHtml: path.relative(rootDir, targetPath),
    fetchedAt: timestamp(),
    bytes: Buffer.byteLength(html)
  };
}

async function main() {
  await ensureDirs();
  const seeds = await loadSeeds();
  const manifest = [];

  for (const seed of seeds) {
    process.stdout.write(`Fetching ${seed.nameKo} ... `);
    try {
      const entry = await fetchPage(seed);
      manifest.push(entry);
      process.stdout.write("ok\n");
    } catch (error) {
      manifest.push({
        id: seed.id,
        nameKo: seed.nameKo,
        sourcePage: seed.sourcePage,
        fetchedAt: timestamp(),
        error: error.message
      });
      process.stdout.write(`failed: ${error.message}\n`);
    }
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Saved fetch manifest to ${path.relative(rootDir, manifestPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
