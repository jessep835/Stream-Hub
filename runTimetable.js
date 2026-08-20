// Stream/runTimetable.js
// End-to-end runner: read two week screenshots with Groq vision,
// normalise into streamTimetable.json.
//
// Usage:
//   node runTimetable.js                                (defaults to week1.png / week2.png)
//   node runTimetable.js week1.png week2.png
//   node runTimetable.js week1.png week2.png custom.json
//
// Provide your Groq API key via env var GROQ_API_KEY or Stream/groq.key.
const fs = require("fs");
const path = require("path");
const { readTimetableImage } = require("./timetableVision");
const { buildTimetable } = require("./timetableBuilder");
function resolveArg(arg, fallback) {
  if (!arg) return path.join(__dirname, fallback);
  return path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
}
async function scanIfExists(label, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.warn(`[run] ${label} not found at ${filePath} — skipping`);
    return null;
  }
  return await readTimetableImage(filePath);
}
async function main() {
  const [w1Arg, w2Arg, outArg] = process.argv.slice(2);
  const week1Path = resolveArg(w1Arg, "week1.png");
  const week2Path = resolveArg(w2Arg, "week2.png");
  const outPath = outArg
    ? (path.isAbsolute(outArg) ? outArg : path.resolve(process.cwd(), outArg))
    : path.join(__dirname, "streamTimetable.json");
  const week1 = await scanIfExists("week1", week1Path);
  const week2 = await scanIfExists("week2", week2Path);
  if (!week1 && !week2) {
    console.error("[run] no screenshots found — nothing to do");
    process.exit(1);
  }
  const timetable = buildTimetable({ week1, week2 });
  fs.writeFileSync(outPath, JSON.stringify(timetable, null, 2));
  console.log("\n[run] wrote:", outPath);
  console.log(JSON.stringify(timetable, null, 2));
}
main().catch((err) => {
  console.error("[run] failed:", err.message || err);
  process.exit(1);
});