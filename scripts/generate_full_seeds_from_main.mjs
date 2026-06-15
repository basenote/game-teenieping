import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const mainPagePath = path.join(rootDir, "data", "raw", "pages", "teenieping-main.html");
const seedsDir = path.join(rootDir, "data", "seeds");
const processedDir = path.join(rootDir, "data", "processed");
const fullSeedsPath = path.join(seedsDir, "characters.full.json");
const summaryPath = path.join(processedDir, "full-seed-summary.json");

const sectionConfigs = [
  { anchor: "s-4.1.1.1", season: 1, category: "royal", seriesTitle: "캐치! 티니핑", sectionTitle: "1기 로열 티니핑" },
  { anchor: "s-4.1.1.2", season: 1, category: "general", seriesTitle: "캐치! 티니핑", sectionTitle: "1기 일반 티니핑" },
  { anchor: "s-4.1.2.1", season: 2, category: "royal", seriesTitle: "반짝반짝 캐치! 티니핑", sectionTitle: "2기 로열 티니핑" },
  { anchor: "s-4.1.2.2", season: 2, category: "general", seriesTitle: "반짝반짝 캐치! 티니핑", sectionTitle: "2기 일반 티니핑" },
  { anchor: "s-4.1.3.1", season: 3, category: "royal", seriesTitle: "알쏭달쏭 캐치! 티니핑", sectionTitle: "3기 로열 티니핑" },
  { anchor: "s-4.1.3.2", season: 3, category: "legend", seriesTitle: "알쏭달쏭 캐치! 티니핑", sectionTitle: "3기 레전드 티니핑" },
  { anchor: "s-4.1.3.3", season: 3, category: "general", seriesTitle: "알쏭달쏭 캐치! 티니핑", sectionTitle: "3기 일반 티니핑" },
  { anchor: "s-4.1.4.1", season: 4, category: "royal", seriesTitle: "새콤달콤 캐치! 티니핑", sectionTitle: "4기 로열 티니핑" },
  { anchor: "s-4.1.4.2", season: 4, category: "legend", seriesTitle: "새콤달콤 캐치! 티니핑", sectionTitle: "4기 레전드 티니핑" },
  { anchor: "s-4.1.4.3", season: 4, category: "general", seriesTitle: "새콤달콤 캐치! 티니핑", sectionTitle: "4기 일반 티니핑" },
  { anchor: "s-4.1.5.1", season: 5, category: "royal", seriesTitle: "슈팅스타 캐치! 티니핑", sectionTitle: "5기 로열 티니핑" },
  { anchor: "s-4.1.5.2", season: 5, category: "legend", seriesTitle: "슈팅스타 캐치! 티니핑", sectionTitle: "5기 레전드 티니핑" },
  { anchor: "s-4.1.5.3", season: 5, category: "general", seriesTitle: "슈팅스타 캐치! 티니핑", sectionTitle: "5기 일반 티니핑" },
  { anchor: "s-4.1.6.1", season: 6, category: "royal", seriesTitle: "프린세스 캐치! 티니핑", sectionTitle: "6기 로열 티니핑" },
  { anchor: "s-4.1.6.2", season: 6, category: "legend", seriesTitle: "프린세스 캐치! 티니핑", sectionTitle: "6기 레전드 티니핑" },
  { anchor: "s-4.1.6.3", season: 6, category: "general", seriesTitle: "프린세스 캐치! 티니핑", sectionTitle: "6기 일반 티니핑" }
];

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNameKey(value) {
  return value.replace(/\s+/g, "");
}

function defaultThemeColor(season, category) {
  const seasonColors = {
    1: ["#ff8ec4", "#ffd970"],
    2: ["#8fd6ff", "#ffffff"],
    3: ["#98df99", "#ffc7eb"],
    4: ["#ffb36c", "#fff0a4"],
    5: ["#7e8cff", "#ffe176"],
    6: ["#ff9fd4", "#fff2b5"]
  };
  const categoryAccent = {
    royal: "#ff69b4",
    legend: "#f7c95c",
    general: "#8fc3ff"
  };

  const [base, accent] = seasonColors[season] ?? ["#d7d7ff", "#ffffff"];
  return { themeColor: base, accentColor: categoryAccent[category] ?? accent };
}

function defaultSilhouette(category) {
  if (category === "royal") return "crown";
  if (category === "legend") return "star";
  return "heart";
}

function difficultyByCategory(category) {
  if (category === "royal") return "medium";
  if (category === "legend") return "hard";
  return "medium";
}

function parseSectionEntries(sectionHtml) {
  const entries = [];
  const startMarker = "<div style='display:inline-block;width:112px'";
  let cursor = 0;

  while (true) {
    const blockStart = sectionHtml.indexOf(startMarker, cursor);
    if (blockStart === -1) break;

    const blockEnd = sectionHtml.indexOf("</a></div>", blockStart);
    if (blockEnd === -1) break;

    const blockHtml = sectionHtml.slice(blockStart, blockEnd + "</a></div>".length);
    cursor = blockEnd + "</a></div>".length;

    const hrefMatch = blockHtml.match(/<a class='GRpmvNuq' href='([^']+)' title='([^']+)'/i);
    const imageMatch = blockHtml.match(/data-src='\/\/(i\.namu\.wiki\/i\/[^']+)'[^>]*alt='([^']*)'/i);
    const labelMatch = blockHtml.match(/<br[^>]*>([\s\S]{0,600})<\/a><\/div>$/i);

    if (!hrefMatch || !imageMatch || !labelMatch) continue;

    const href = decodeHtml(hrefMatch[1]);
    const title = decodeHtml(stripTags(hrefMatch[2]));
    const imageUrl = `https://${imageMatch[1]}`;
    const alt = decodeHtml(stripTags(imageMatch[2]));
    const rawDisplayName = decodeHtml(stripTags(labelMatch[1]));
    const displayName =
      normalizeNameKey(rawDisplayName) === normalizeNameKey(title) ? title : rawDisplayName;

    if (!displayName) continue;

    entries.push({ href, title, imageUrl, alt, displayName });
  }

  return entries;
}

function extractPrimaryDetailsBlock(sectionHtml) {
  const detailsStart = sectionHtml.indexOf("<details");
  if (detailsStart === -1) return sectionHtml;

  const tagPattern = /<\/?details\b[^>]*>/gi;
  tagPattern.lastIndex = detailsStart;

  let depth = 0;
  let match;

  while ((match = tagPattern.exec(sectionHtml)) !== null) {
    if (match[0].startsWith("</details")) {
      depth -= 1;
      if (depth === 0) {
        return sectionHtml.slice(detailsStart, match.index + match[0].length);
      }
      continue;
    }

    depth += 1;
  }

  return sectionHtml.slice(detailsStart);
}

function buildSections(html) {
  return sectionConfigs.map((config) => {
    const startPattern = new RegExp(`id='${escapeRegex(config.anchor)}'`);
    const startMatch = startPattern.exec(html);
    if (!startMatch) {
      return { ...config, entries: [] };
    }

    const sliceStart = startMatch.index;
    const nextHeadingPattern = /id='s-4\.1\.\d+\.\d+'/g;
    nextHeadingPattern.lastIndex = sliceStart + config.anchor.length;
    const nextHeadingMatch = nextHeadingPattern.exec(html);
    const sliceEnd = nextHeadingMatch?.index ?? html.length;
    const sectionHtml = html.slice(sliceStart, sliceEnd === -1 ? html.length : sliceEnd);
    const detailsHtml = extractPrimaryDetailsBlock(sectionHtml);

    return {
      ...config,
      entries: parseSectionEntries(detailsHtml)
    };
  });
}

function makeSeed(section, entry, index) {
  const { themeColor, accentColor } = defaultThemeColor(section.season, section.category);
  return {
    id: `s${section.season}-${section.category}-${String(index + 1).padStart(3, "0")}`,
    nameKo: entry.displayName,
    season: section.season,
    seriesTitle: section.seriesTitle,
    category: section.category,
    sourcePage: `https://namu.wiki${entry.href}`,
    sourceImageUrl: entry.imageUrl,
    difficultyBase: difficultyByCategory(section.category),
    themeColor,
    accentColor,
    silhouette: defaultSilhouette(section.category),
    summaryFallback: `${entry.displayName} 티니핑이에요.`,
    hints: [
      `${entry.displayName}의 특징을 설명할 상세 힌트는 후속 정제 단계에서 보강할 예정이에요.`
    ],
    voice: {
      status: "needs-review"
    },
    meta: {
      entryTitle: entry.title,
      imageAlt: entry.alt,
      sectionTitle: section.sectionTitle
    }
  };
}

async function main() {
  await mkdir(seedsDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });

  const html = await readFile(mainPagePath, "utf8");
  const sections = buildSections(html);

  const seeds = [];
  const summary = [];

  for (const section of sections) {
    const uniqueEntries = [];
    const seenNames = new Set();

    for (const entry of section.entries) {
      const key = entry.displayName.replace(/\s+/g, "");
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      uniqueEntries.push(entry);
    }

    uniqueEntries.forEach((entry, index) => {
      seeds.push(makeSeed(section, entry, index));
    });

    summary.push({
      sectionTitle: section.sectionTitle,
      season: section.season,
      category: section.category,
      count: uniqueEntries.length
    });
  }

  await writeFile(fullSeedsPath, JSON.stringify(seeds, null, 2), "utf8");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(`Generated ${seeds.length} full seeds`);
  console.log(`- ${path.relative(rootDir, fullSeedsPath)}`);
  console.log(`- ${path.relative(rootDir, summaryPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
