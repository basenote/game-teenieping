import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const processedJsonPath = path.join(rootDir, "data", "processed", "characters.json");

async function main() {
  try {
    const text = await readFile(processedJsonPath, "utf8");
    const characters = JSON.parse(text);

    const missingImages = [];
    const missingVoices = [];
    const needsReviewVoices = [];
    const readyVoices = [];

    for (const char of characters) {
      if (!char.image) {
        missingImages.push(char);
      }

      const voiceStatus = char.voice?.status || "missing";
      if (voiceStatus === "ready") {
        readyVoices.push(char);
      } else if (voiceStatus === "needs-review") {
        needsReviewVoices.push(char);
      } else if (voiceStatus === "missing") {
        missingVoices.push(char);
      }
    }

    console.log("=== Asset Verification Report ===");
    console.log(`Total Characters: ${characters.length}`);
    console.log("---------------------------------");
    console.log(`Missing Images: ${missingImages.length}`);
    console.log(`Ready Voices: ${readyVoices.length}`);
    console.log(`Voices Needing Review: ${needsReviewVoices.length}`);
    console.log(`Missing Voices: ${missingVoices.length}`);
    console.log("---------------------------------");

    if (missingImages.length > 0) {
      console.log("\n[Missing Images]");
      missingImages.slice(0, 20).forEach(c => console.log(`- ${c.id}: ${c.nameKo}`));
      if (missingImages.length > 20) console.log(`... and ${missingImages.length - 20} more`);
    }

    if (needsReviewVoices.length > 0) {
      console.log("\n[Voices Needing Review]");
      needsReviewVoices.slice(0, 20).forEach(c => console.log(`- ${c.id}: ${c.nameKo} (${c.voice.evidenceUrl || "No URL"})`));
      if (needsReviewVoices.length > 20) console.log(`... and ${needsReviewVoices.length - 20} more`);
    }

    if (missingVoices.length > 0) {
      console.log("\n[Missing Voices]");
      missingVoices.slice(0, 20).forEach(c => console.log(`- ${c.id}: ${c.nameKo}`));
      if (missingVoices.length > 20) console.log(`... and ${missingVoices.length - 20} more`);
    }

  } catch (error) {
    console.error("Error verifying assets:", error.message);
  }
}

main();
