// Stream/timetableVision.js
// Reads a timetable screenshot using a Groq vision model.
// Returns a fully structured week: { "Monday": { "Period 1": "MAT202", ... }, ... }
//
// Free API: get a key at https://console.groq.com/keys
// Provide the key via:
//   - env var  GROQ_API_KEY, or
//   - a file   Stream/groq.key   (just the raw key, nothing else)
//
// Model selection auto-heals: it queries Groq for the models your account
// can actually see, then picks the first vision-capable one from the
// prioritised list below. You can force a specific model with:
//   - env var  GROQ_MODEL, or
//   - a file   Stream/groq.model  (just the raw model id)
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ALL_PREFIXES, SUBJECTS } = require("./subjects");
const MODEL = [
    "gemini-3.5-flash-lite"
]
const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DEFAULT_PERIODS = 5;
function loadApiKey(){
    if(process.env.GEMINI_API_KEY)
        return process.env.GEMINI_API_KEY.trim();
    const keyFile = path.join(__dirname,"gemini.key");
    if(fs.existsSync(keyFile))
        return fs.readFileSync(keyFile,"utf8").trim();
    throw new Error(
        "Gemini API key missing. Add Stream/gemini.key"
    );
}
function loadModelOverride() {
  if (process.env.GROQ_MODEL) return process.env.GROQ_MODEL.trim();
  const f = path.join(__dirname, "groq.model");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  return null;
}
function imageToDataUrl(imagePath) {
  const buf = fs.readFileSync(imagePath);
  const ext = (path.extname(imagePath) || ".png").slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buf.toString("base64")}`;
}
function imageToBase64(imagePath){
    const buf = fs.readFileSync(imagePath);
    return buf.toString("base64");
}
function subjectReference() {
  return SUBJECTS.map((s) => `${s.prefix} = ${s.name}`).join("\n");
}
function buildPrompt(days, periodCount) {
  const daysList = days.join(", ");
  const example = {};
  for (const d of days) {
    example[d] = {};
    for (let i = 1; i <= periodCount; i++) example[d][`Period ${i}`] = "MAT202_or_ASS_or_TUT_or_Free";
  }
  return `You are reading a New Zealand secondary school timetable screenshot.
TASK
For every cell of the grid, return the subject code shown in that cell.
IMPORTANT:
- If a cell says "Assembly", return "Assembly".
- If a cell says "Tutor Time", "Tutor", "Form", or similar, return "Tutor Time".
- Assembly and Tutor Time are NOT Free.
- Only return "Free" when the cell is genuinely empty, free/study, or explicitly marked Free.
IMPORTANT EVENT RULES
- ONLY extract actual NCEA subject codes and ASSEMBLY.
- Assembly must be returned exactly as "Assembly".
- DO NOT return Tutor Time, Tutor, Form, Homeroom, Whānau, Study, Break, Lunch, Interval, or any other non-subject event.
- Tutor Time is part of the school's TIME STRUCTURE, NOT a timetable subject.
- If a cell corresponds to Tutor Time, return "Free".
- Assembly is the ONLY exception: it must be returned as "Assembly".
- NEVER invent a "TUT" subject code.
- NEVER create a "Tutor Time" entry.
IMPORTANT:
- Include non-subject timetable events.
- Assembly must be returned as "ASS".
- Free periods should only be returned as "Free".
- Do not replace Assembly, Tutor Time, or school events with Free.
VERY IMPORTANT:
Tuesday does NOT have a normal Period 4.
The slot from 12:00pm–12:25pm is Tutor Time.
The slot from 12:25pm–1:15pm is Assembly.
Therefore, when reading Tuesday, NEVER interpret the Assembly cell as Period 4.
Return Tuesday special events using these exact keys:
"Period 3": "<subject code>",
"Assembly": "ASS",
"Period 5": "<subject code>"
Example:
{
    "Period 1": "ENG200",
    "Period 2": "MAT202",
    "Period 3": "DVC200",
    "Assembly": "ASS",
    "Period 5": "PHY200"
}
GRID SHAPE
- Days along the top (left to right): ${daysList}
- ${periodCount} periods per day, top to bottom, labelled Period 1 through Period ${periodCount}.
SUBJECT CODE FORMAT
A subject code is: <2-4 UPPERCASE LETTERS><LEVEL DIGIT><2 DIGITS>
- Letters identify the subject (see reference list below).
- Level digit is 1, 2, or 3 (NCEA level).
- Final 2 digits are the school's internal variant (00, 01, 02, ...).
Examples: MAT202, PHY301, CHE200, ENG101, RST200, DVC302, PED201, HFT200, MAO100.
READING THE CELL
- Look at what is ACTUALLY printed in the cell — do not guess.
- Ignore the teacher name, room number, and any times shown in the cell.
- Just return the subject code, exactly as printed (e.g. "MAT202", "PED201").
- Be careful with visually similar letters. Common confusables to double-check:
    PED vs RED vs PET vs PES
    RST vs RS1 vs RSI
    MAT vs MAR vs NAT
    DVC vs DUC vs OVC
    CHE vs CHF vs CUE
    ENG vs ENC vs FNG
    PHY vs PHV vs PNY
    HFT vs HET vs NFT
- If a cell contains no subject (blank, "Free", "Study", "Interval", "Lunch",
  "Assembly", "Tutor", "Whanau", etc.), use the literal string "Free".
- If you truly cannot read a cell, use "Free" (do NOT invent codes).
- Never create new subjects, no wild assumptions.
IMPORTANT TIMETABLE STRUCTURE RULES:
Monday, Wednesday and Friday:
Period 1
Period 2
Break
Period 3
Period 4
Lunch
Period 5
Tuesday:
Period 1
Period 2
Break
Period 3
Tutor Time (12:00pm–12:25pm)
Assembly (12:25pm–1:15pm)
Lunch
Period 5
Thursday:
Period 1
Period 2
Break
Period 3
Period 4
Tutor Time (12:45pm–1:15pm)
Lunch
Period 5
REFERENCE — VALID PREFIXES (letters portion only):
${subjectReference()}
OUTPUT
Return ONLY valid JSON in EXACTLY this shape, using the day names above as
keys and "Period 1".."Period ${periodCount}" as sub-keys. No markdown, no
commentary, no code fences.
${JSON.stringify(example, null, 2)}`;
}
async function fetchAvailableModels(apiKey) {
  try {
    const res = await fetch(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data || []).map((m) => m.id);
  } catch {
    return null;
  }
}
async function chooseModel(apiKey) {
  if (CACHED_MODEL) return CACHED_MODEL;
  const override = loadModelOverride();
  if (override) {
    console.log("[VISION] using model override:", override);
    CACHED_MODEL = override;
    return override;
  }
  const available = await fetchAvailableModels(apiKey);
  if (available && available.length) {
    console.log("[VISION] your account has", available.length, "models");
    for (const m of MODEL_CANDIDATES) {
      if (available.includes(m)) {
        console.log("[VISION] using model:", m);
        CACHED_MODEL = m;
        return m;
      }
    }
    const visionish = available.find((id) =>
      /vision|scout|multimodal|llama-4/i.test(id)
    );
    if (visionish) {
      console.log("[VISION] falling back to detected model:", visionish);
      CACHED_MODEL = visionish;
      return visionish;
    }
  }
  console.log("[VISION] models endpoint unavailable, defaulting to", MODEL_CANDIDATES[0]);
  CACHED_MODEL = MODEL_CANDIDATES[0];
  return CACHED_MODEL;
}
async function postChat(model, dataUrl, days, periodCount, apiKey) {
  const body = {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildPrompt(days, periodCount) },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  };
  return fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
async function callGemini(imagePath){
    const apiKey = loadApiKey();
    const genAI =
        new GoogleGenerativeAI(apiKey);
    const model =
        genAI.getGenerativeModel({
            model: MODEL
        });
    const base64 = imageToBase64(imagePath);
    const result =
    await model.generateContent([
        {
            text: buildPrompt(DEFAULT_DAYS, DEFAULT_PERIODS)
        },
        {
            inlineData:{
                data:base64,
                mimeType:"image/png"
            }
        }
    ]);
    let text =
    result.response.text();
    console.log("[GEMINI RAW]");
    console.log(text);
    text =
    text
    .replace(/```json/g,"")
    .replace(/```/g,"")
    .trim();
    return JSON.parse(text);
}
async function readTimetableImage(imagePath, options = {}) {
    console.log("[VISION] reading", imagePath);
    const raw =
    await callGemini(imagePath);
    console.log(
    "[VISION RESULT]",
    JSON.stringify(raw,null,2)
    );
    return raw;
}
module.exports = { readTimetableImage, DEFAULT_DAYS, DEFAULT_PERIODS, ALL_PREFIXES };