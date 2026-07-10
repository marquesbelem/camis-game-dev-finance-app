import * as fs from "fs";
import * as path from "path";

function scanDir(dir: string, results: { path: string, mtime: Date, size: number }[]) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath, results);
      } else if (file === "transcript.jsonl") {
        results.push({ path: fullPath, mtime: stat.mtime, size: stat.size });
      }
    }
  } catch (e) {}
}

function main() {
  const results: { path: string, mtime: Date, size: number }[] = [];
  scanDir("C:/Users/camil/.gemini/antigravity-ide/brain", results);

  results.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  console.log(`Found ${results.length} transcripts:`);
  results.forEach((r, i) => {
    console.log(`${i+1}. ${r.path} (${r.size} bytes, mtime: ${r.mtime.toISOString()})`);
  });
}

main();
