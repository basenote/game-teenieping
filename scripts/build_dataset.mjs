import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultSeedPath = path.join(rootDir, "data", "seeds", "characters.seed.json");
const rawPagesDir = path.join(rootDir, "data", "raw", "pages");
const mainPagePath = path.join(rawPagesDir, "teenieping-main.html");
const processedDir = path.join(rootDir, "data", "processed");
const processedJsonPath = path.join(processedDir, "characters.json");
const listCatalogPath = path.join(processedDir, "list-image-catalog.json");
const manualVoicePath = path.join(rootDir, "data", "manual", "voice-sources.json");
const webDataDir = path.join(rootDir, "web", "data");
const webDataPath = path.join(webDataDir, "characters.generated.js");
const assetsDir = path.join(rootDir, "web", "assets", "images", "characters");
const voiceAssetsDir = path.join(rootDir, "web", "assets", "audio", "voices");

async function ensureDirs() {
  await mkdir(processedDir, { recursive: true });
  await mkdir(webDataDir, { recursive: true });
}

async function loadSeeds() {
  const arg = process.argv.find((entry) => entry.startsWith("--seed="));
  const seedPath = arg ? path.resolve(rootDir, arg.slice("--seed=".length)) : defaultSeedPath;
  const text = await readFile(seedPath, "utf8");
  return JSON.parse(text);
}

async function findLocalImagePath(id) {
  try {
    const files = await readdir(assetsDir);
    const file = files.find((entry) => entry.startsWith(`${id}.`));
    return file ? `./assets/images/characters/${file}` : null;
  } catch {
    return null;
  }
}

async function tryReadRawHtml(id) {
  try {
    return await readFile(path.join(rawPagesDir, `${id}.html`), "utf8");
  } catch {
    return "";
  }
}

async function tryReadMainPage() {
  try {
    return await readFile(mainPagePath, "utf8");
  } catch {
    return "";
  }
}

async function tryLoadVoiceOverrides() {
  try {
    const text = await readFile(manualVoicePath, "utf8");
    const items = JSON.parse(text);
    return new Map(items.map((item) => [item.characterId, item]));
  } catch {
    return new Map();
  }
}

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[0-9]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#91;/g, "[")
    .replace(/&#93;/g, "]");
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeNameKey(value) {
  return value.replace(/\s+/g, "");
}

function categoryLabel(category) {
  if (category === "royal") return "로열 티니핑";
  if (category === "legend") return "레전드 티니핑";
  if (category === "general") return "일반 티니핑";
  return "티니핑";
}

function extractSummary(html, seed) {
  if (!html) {
    return seed.summaryFallback;
  }

  // 1. Try to find the content under '1. 개요' or '1. 소개' in HTML
  const headingMatch = html.match(/<h[234][^>]*>.*?1\..*?(?:개요|소개).*?<\/h[234]>(.*?)<h[234]/s);
  if (headingMatch?.[1]) {
    const cleaned = normalizeWhitespace(stripTags(decodeHtml(headingMatch[1])));
    if (cleaned.length >= 20) {
      return cleaned.slice(0, 250);
    }
  }

  // 2. Fallback to og:description
  const metaDescriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/i);
  if (metaDescriptionMatch?.[1]) {
    const cleaned = normalizeWhitespace(decodeHtml(metaDescriptionMatch[1]));
    if (cleaned.length >= 20) {
      return cleaned.slice(0, 180);
    }
  }

  return seed.summaryFallback;
}

function extractInfobox(html) {
  const result = {};
  if (!html) return result;

  const fields = {
    magic: /마법.*?<\/td><td[^>]*><div[^>]*>(.*?)<\/div><\/td>/s,
    likes: /좋아하는 것.*?<\/td><td[^>]*><div[^>]*>(.*?)<\/div><\/td>/s,
    dislikes: /싫어하는 것.*?<\/td><td[^>]*><div[^>]*>(.*?)<\/div><\/td>/s
  };

  for (const [key, pattern] of Object.entries(fields)) {
    const match = html.match(pattern);
    if (match) {
      result[key] = normalizeWhitespace(stripTags(decodeHtml(match[1])));
    }
  }

  return result;
}

function buildHint(summary, seed, infobox = {}) {
  const fallback = `${seed.season}기 ${categoryLabel(seed.category)} 캐릭터예요.`;
  
  // Use magic for a very specific hint
  if (infobox.magic && infobox.magic.length > 5) {
    const magicHint = infobox.magic.replace(new RegExp(escapeRegex(seed.nameKo), "g"), "이 캐릭터");
    if (magicHint.length > 10 && !magicHint.includes(seed.nameKo)) {
       return magicHint;
    }
  }

  const cleanedSummary = normalizeWhitespace(summary || "");
  if (!cleanedSummary || cleanedSummary === seed.summaryFallback) {
    return fallback;
  }

  const sentences = cleanedSummary
    .replace(/[“”"]/g, '"')
    .split(/(?<=[.!?。]|다\.|요\.)\s+/)
    .map((entry) =>
      normalizeWhitespace(
        entry
          .replace(/^"[^"]{1,80}"\s*/g, "")
          .replace(/^참고로[^.?!]{1,120}[.?!]\s*/g, "")
      )
    )
    .filter(Boolean);

  const descriptiveKeywords = ["성격", "요정", "마법", "보호", "상냥", "다정", "기품", "용감", "공주", "열쇠", "우주", "마음", "상징"];
  const penaltyKeywords = ["참고로", "본편", "대사", "문서", "나무위키", "수정"];

  const bestSentence =
    sentences
      .map((entry) => {
        let score = 0;
        if (entry.length >= 16) score += 2;
        if (entry.length <= 100) score += 1;
        if (descriptiveKeywords.some((keyword) => entry.includes(keyword))) score += 5;
        if (penaltyKeywords.some((keyword) => entry.includes(keyword))) score -= 6;
        if (entry.includes('"')) score -= 2;
        if (entry.includes(seed.nameKo)) score -= 1;
        return { entry, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.entry ??
    sentences[0] ??
    cleanedSummary;

  let hint = bestSentence
    .replace(new RegExp(escapeRegex(seed.nameKo), "g"), "이 캐릭터")
    .replace(/\(\s*티니핑 시리즈\s*\)/g, "")
    .replace(/\b이 캐릭터는 이 캐릭터\b/g, "이 캐릭터는")
    .replace(/\b이 캐릭터 나는\b/g, "이 캐릭터는")
    .replace(/티니핑,\s*이 캐릭터/g, "티니핑으로")
    .replace(/\s+/g, " ")
    .trim();

  if (hint.includes(seed.nameKo)) {
    const afterName = normalizeWhitespace(hint.split(seed.nameKo).pop() || "");
    if (afterName.length >= 12) {
      hint = afterName;
    }
  }

  if (normalizeNameKey(hint).includes(normalizeNameKey(seed.nameKo))) {
    hint = fallback;
  }

  if (hint.length < 12) {
    hint = fallback;
  }

  if (hint.length > 120) {
    hint = `${hint.slice(0, 117).trim()}...`;
  }

  return hint;
}

function extractRecentModified(html) {
  const match = html.match(/최근 수정 시각\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})/);
  return match?.[1]?.trim() ?? null;
}

function buildListImageCatalog(mainHtml) {
  const catalog = [];
  if (!mainHtml) return catalog;

  const entryPattern = /<img[^>]*data-src=['"]\/\/(i\.namu\.wiki\/i\/[^'"]+)['"][^>]*alt=['"]([^'"]*)['"][^>]*>[\s\S]{0,400}?<br[^>]*>[\s\S]{0,160}?(?:<span[^>]*>)?(?:<a[^>]*title=['"]([^'"]*)['"][^>]*>)?([^<]+)(?:<\/a>)?(?:<\/span>)?/gi;
  let match;

  while ((match = entryPattern.exec(mainHtml)) !== null) {
    const imageUrl = `https://${match[1]}`;
    const alt = decodeHtml(stripTags(match[2] || ""));
    const linkTitle = decodeHtml(stripTags(match[3] || ""));
    const displayName = decodeHtml(stripTags(match[4] || "")).trim();

    if (!displayName) continue;

    catalog.push({
      displayName,
      linkTitle,
      alt,
      imageUrl
    });
  }

  return catalog;
}

function findImageUrlFromCatalog(catalog, seed) {
  const normalizedName = seed.nameKo.replace(/\s+/g, "");

  const exactDisplay = catalog.find((entry) => entry.displayName.replace(/\s+/g, "") === normalizedName);
  if (exactDisplay) return exactDisplay.imageUrl;

  const exactAlt = catalog.find((entry) => entry.alt.replace(/\s+/g, "") === normalizedName);
  if (exactAlt) return exactAlt.imageUrl;

  const looseDisplay = catalog.find((entry) => entry.displayName.replace(/\s+/g, "").includes(normalizedName));
  if (looseDisplay) return looseDisplay.imageUrl;

  return null;
}

function extractImageUrl(html, seed, listCatalog) {
  const catalogUrl = findImageUrlFromCatalog(listCatalog, seed);
  if (catalogUrl) {
    return catalogUrl;
  }

  const directMatch = html.match(/https:\/\/[^"' ]+\.(png|jpg|jpeg|webp)/i);
  if (directMatch?.[0]) {
    return directMatch[0];
  }

  const normalizedSeedName = seed.nameKo.replace(/\s+/g, "");
  const imageTagPattern = /<img[^>]*alt=["']([^"']+)["'][^>]*data-original=["']\/\/(file\.namu\.moe\/file\/[^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imageTagPattern.exec(html)) !== null) {
    const alt = match[1].replace(/\s+/g, "");
    const fileUrl = match[2];
    if (alt.includes(normalizedSeedName)) {
      return `https://${fileUrl}`;
    }
  }

  const mirrorFileMatch = html.match(/data-original=["']\/\/(file\.namu\.moe\/file\/[^"']+)["']/i);
  if (mirrorFileMatch?.[1]) {
    return `https://${mirrorFileMatch[1]}`;
  }

  const srcMatch = html.match(/src=["']\/\/(file\.namu\.moe\/file\/[^"']+)["']/i);
  if (srcMatch?.[1]) {
    return `https://${srcMatch[1]}`;
  }

  return null;
}

async function buildCharacter(seed, listCatalog) {
  return buildCharacterWithVoice(seed, listCatalog, new Map());
}

async function findLocalVoicePath(id) {
  try {
    const files = await readdir(voiceAssetsDir);
    const file = files.find((entry) => entry.startsWith(`${id}.`));
    return file ? `./assets/audio/voices/${file}` : null;
  } catch {
    return null;
  }
}

async function buildCharacterWithVoice(seed, listCatalog, voiceOverrides) {
  const html = await tryReadRawHtml(seed.id);
  const summary = extractSummary(html, seed);
  const infobox = extractInfobox(html);
  const recentModified = extractRecentModified(html);
  const sourceImageUrl = extractImageUrl(html, seed, listCatalog);
  const image = await findLocalImagePath(seed.id);
  const localVoicePath = await findLocalVoicePath(seed.id);
  const manualVoice = voiceOverrides.get(seed.id);

  // Build hints
  const hints = [];
  const primaryHint = buildHint(summary, seed, infobox);
  hints.push(primaryHint);

  // Add a secondary hint based on likes if possible
  if (infobox.likes && infobox.likes.length > 5) {
    const likesHint = `이 캐릭터는 '${infobox.likes}'을(를) 좋아해요.`.replace(new RegExp(escapeRegex(seed.nameKo), "g"), "이 캐릭터");
    if (!likesHint.includes(seed.nameKo)) {
      hints.push(likesHint);
    }
  }

  const voice = {
    status: localVoicePath ? "ready" : (manualVoice?.status ?? "missing"),
    ...(manualVoice ?? {}),
    clipPath: localVoicePath ?? manualVoice?.clipPath,
    reviewed: manualVoice?.reviewed ?? false
  };

  if (voice.clipPath && voice.status !== "ready") {
    voice.status = "ready";
  }

  return {
    id: seed.id,
    nameKo: seed.nameKo,
    season: seed.season,
    seriesTitle: seed.seriesTitle,
    category: seed.category,
    difficultyBase: seed.difficultyBase,
    themeColor: seed.themeColor,
    accentColor: seed.accentColor,
    silhouette: seed.silhouette,
    sourcePage: seed.sourcePage,
    image,
    sourceImageUrl,
    sourceRecentModified: recentModified,
    summary,
    hints,
    infobox,
    voice
  };
}

async function main() {
  await ensureDirs();
  const seeds = await loadSeeds();
  const mainHtml = await tryReadMainPage();
  const listCatalog = buildListImageCatalog(mainHtml);
  const voiceOverrides = await tryLoadVoiceOverrides();
  const characters = [];

  for (const seed of seeds) {
    characters.push(await buildCharacterWithVoice(seed, listCatalog, voiceOverrides));
  }

  await writeFile(listCatalogPath, JSON.stringify(listCatalog, null, 2), "utf8");
  await writeFile(processedJsonPath, JSON.stringify(characters, null, 2), "utf8");

  const webModule = `window.CHARACTERS_DATA = ${JSON.stringify(characters, null, 2)};\n`;
  await writeFile(webDataPath, webModule, "utf8");

  console.log(`Built ${characters.length} characters`);
  console.log(`- ${path.relative(rootDir, listCatalogPath)}`);
  console.log(`- ${path.relative(rootDir, processedJsonPath)}`);
  console.log(`- ${path.relative(rootDir, webDataPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
