// Stream/subjects.js
// Canonical registry of NCEA subjects (Levels 1, 2, 3).
//
// Each entry has:
//   prefix   - 2-4 letter code used at the start of the subject code
//   name     - human-readable name
//   aliases  - alternative names or common OCR/vision misreads
//
// A "subject code" looks like: <PREFIX><LEVEL DIGIT><TWO DIGITS>
//   e.g. MAT202  =  MAT (Mathematics) + 2 (Level 2) + 02 (school's variant)
//        PHY301  =  PHY (Physics)     + 3 (Level 3) + 01
//        RST101  =  RST (Rel. Studies)+ 1 (Level 1) + 01
//
// Level digit is always 1, 2, or 3. The final two digits are the school's
// internal variant (00, 01, 02, ..., 99) — we accept anything.
const SUBJECTS = [
  // ── Mathematics & Statistics ──────────────────────────────────
  { prefix: "MAT", name: "Mathematics",              aliases: ["MATH", "MATHS", "CORE MATHS", "MATHEMATICS"] },
  { prefix: "MTH", name: "Mathematics (alt)",        aliases: [] },
  { prefix: "MAS", name: "Statistics",               aliases: ["STATS", "STATISTICS"] },
  { prefix: "STA", name: "Statistics (alt)",         aliases: [] },
  { prefix: "MAC", name: "Calculus",                 aliases: ["CALC", "CALCULUS"] },
  { prefix: "CAL", name: "Calculus (alt)",           aliases: [] },
  // ── English & Literacy ────────────────────────────────────────
  { prefix: "ENG", name: "English",                  aliases: ["ENGLISH"] },
  { prefix: "ESL", name: "ESOL",                     aliases: ["ESOL"] },
  { prefix: "ESO", name: "ESOL (alt)",               aliases: [] },
  { prefix: "LIT", name: "Literature",               aliases: [] },
  { prefix: "LSK", name: "Literacy Skills",          aliases: [] },
  // ── Sciences ──────────────────────────────────────────────────
  { prefix: "SCI", name: "Science",                  aliases: ["SCIENCE"] },
  { prefix: "PHY", name: "Physics",                  aliases: ["PHYSICS"] },
  { prefix: "CHE", name: "Chemistry",                aliases: ["CHEM", "CHEMISTRY"] },
  { prefix: "BIO", name: "Biology",                  aliases: ["BIOL", "BIOLOGY"] },
  { prefix: "ESS", name: "Earth & Space Science",    aliases: ["EARTH SCIENCE"] },
  { prefix: "AGS", name: "Agricultural Science",     aliases: [] },
  { prefix: "AGR", name: "Agriculture",              aliases: ["AGRICULTURE"] },
  { prefix: "HSC", name: "Horticultural Science",    aliases: [] },
  { prefix: "HOR", name: "Horticulture",             aliases: ["HORTICULTURE"] },
  { prefix: "MSC", name: "Marine Science",           aliases: [] },
  // ── Religious / Values / Ethics ───────────────────────────────
  { prefix: "RST", name: "Religious Studies",        aliases: ["RE", "RELIGIOUS STUDIES", "RELIGION"] },
  { prefix: "REL", name: "Religious Education",      aliases: [] },
  { prefix: "REE", name: "Religious Ed (alt)",       aliases: [] },
  { prefix: "RES", name: "Religious Studies (alt)",  aliases: [] },
  // ── Design, Graphics & Technology ─────────────────────────────
  { prefix: "DVC", name: "Design & Visual Comm.",    aliases: ["GRAPHICS", "DVC", "DESIGN VC"] },
  { prefix: "GRA", name: "Graphics",                 aliases: [] },
  { prefix: "TEC", name: "Technology",               aliases: ["TECH", "TECHNOLOGY"] },
  { prefix: "DTG", name: "Digital Tech - Graphics",  aliases: [] },
  { prefix: "DTP", name: "Digital Tech - Programming", aliases: [] },
  { prefix: "DTR", name: "Digital Tech - Robotics",  aliases: [] },
  { prefix: "DTE", name: "Digital Tech - Electronics", aliases: [] },
  { prefix: "DTC", name: "Digital Tech - Computing", aliases: [] },
  { prefix: "DTM", name: "Digital Tech - Media",     aliases: [] },
  { prefix: "DIT", name: "Digital Information Tech", aliases: ["DIGITAL TECH"] },
  { prefix: "DGT", name: "Digital Technologies",     aliases: [] },
  { prefix: "COS", name: "Computer Science",         aliases: ["COMP SCI"] },
  { prefix: "PRO", name: "Product Design",           aliases: [] },
  { prefix: "MTC", name: "Materials Technology",     aliases: [] },
  { prefix: "MFG", name: "Manufacturing",            aliases: [] },
  { prefix: "HFT", name: "Hospitality / Food Tech",  aliases: ["FOOD TECH", "HOSPITALITY"] },
  { prefix: "FST", name: "Food Science & Tech",      aliases: [] },
  { prefix: "FTC", name: "Food Tech",                aliases: [] },
  { prefix: "HTC", name: "Hospitality (alt)",        aliases: [] },
  { prefix: "FOO", name: "Food",                     aliases: [] },
  { prefix: "HOS", name: "Hospitality",              aliases: [] },
  { prefix: "TOU", name: "Tourism",                  aliases: ["TOURISM"] },
  // ── Visual Arts ───────────────────────────────────────────────
  { prefix: "ART", name: "Art",                      aliases: [] },
  { prefix: "ARP", name: "Art - Painting",           aliases: [] },
  { prefix: "ARD", name: "Art - Design",             aliases: [] },
  { prefix: "ARS", name: "Art - Sculpture",          aliases: [] },
  { prefix: "ARH", name: "Art History",              aliases: ["ART HISTORY"] },
  { prefix: "VAR", name: "Visual Arts",              aliases: ["VISUAL ARTS"] },
  { prefix: "PHO", name: "Photography",              aliases: ["PHOTO", "PHOTOGRAPHY"] },
  { prefix: "DES", name: "Design",                   aliases: [] },
  { prefix: "PAI", name: "Painting",                 aliases: [] },
  { prefix: "PRT", name: "Printmaking",              aliases: [] },
  { prefix: "SCU", name: "Sculpture",                aliases: [] },
  // ── Performing Arts ───────────────────────────────────────────
  { prefix: "MUS", name: "Music",                    aliases: ["MUSIC"] },
  { prefix: "MUC", name: "Music (alt)",              aliases: [] },
  { prefix: "DRA", name: "Drama",                    aliases: ["DRAMA"] },
  { prefix: "DAN", name: "Dance",                    aliases: ["DANCE"] },
  { prefix: "MED", name: "Media Studies",            aliases: ["MEDIA"] },
  // ── Physical Education & Health ───────────────────────────────
  { prefix: "PED", name: "Physical Education",       aliases: ["PE", "PHYS ED"] },
  { prefix: "PEH", name: "PE & Health",              aliases: [] },
  { prefix: "PES", name: "PE Studies",               aliases: [] },
  { prefix: "HEA", name: "Health",                   aliases: ["HEALTH"] },
  { prefix: "OED", name: "Outdoor Education",        aliases: ["OUTDOOR ED"] },
  { prefix: "SPS", name: "Sports Science",           aliases: [] },
  { prefix: "SST", name: "Sport Studies",            aliases: [] },
  // ── Social Sciences ───────────────────────────────────────────
  { prefix: "HIS", name: "History",                  aliases: ["HISTORY"] },
  { prefix: "GEO", name: "Geography",                aliases: ["GEOG", "GEOGRAPHY"] },
  { prefix: "CLA", name: "Classical Studies",        aliases: ["CLASSICS"] },
  { prefix: "CLS", name: "Classical Studies (alt)",  aliases: [] },
  { prefix: "ECO", name: "Economics",                aliases: ["ECON", "ECONOMICS"] },
  { prefix: "ECN", name: "Economics (alt)",          aliases: [] },
  { prefix: "ACC", name: "Accounting",               aliases: ["ACCOUNTING"] },
  { prefix: "BUS", name: "Business Studies",         aliases: ["BUSINESS"] },
  { prefix: "ENT", name: "Enterprise",               aliases: [] },
  { prefix: "COM", name: "Commerce",                 aliases: [] },
  { prefix: "PSY", name: "Psychology",               aliases: ["PSYCH"] },
  { prefix: "SOC", name: "Sociology",                aliases: [] },
  { prefix: "LEG", name: "Legal Studies",            aliases: [] },
  { prefix: "AHS", name: "Ancient History",          aliases: [] },
  // ── Languages ─────────────────────────────────────────────────
  { prefix: "FRE", name: "French",                   aliases: ["FRENCH"] },
  { prefix: "FRN", name: "French (alt)",             aliases: [] },
  { prefix: "SPA", name: "Spanish",                  aliases: ["SPANISH"] },
  { prefix: "SPN", name: "Spanish (alt)",            aliases: [] },
  { prefix: "GER", name: "German",                   aliases: ["GERMAN"] },
  { prefix: "JAP", name: "Japanese",                 aliases: ["JAPANESE"] },
  { prefix: "JPN", name: "Japanese (alt)",           aliases: [] },
  { prefix: "CHI", name: "Chinese",                  aliases: ["MANDARIN"] },
  { prefix: "CHN", name: "Chinese (alt)",            aliases: [] },
  { prefix: "MAO", name: "Māori",                    aliases: ["MAORI", "TE REO"] },
  { prefix: "MAR", name: "Māori (alt)",              aliases: [] },
  { prefix: "MRI", name: "Māori (alt)",              aliases: [] },
  { prefix: "TRM", name: "Te Reo Māori",             aliases: [] },
  { prefix: "LAT", name: "Latin",                    aliases: ["LATIN"] },
  { prefix: "KOR", name: "Korean",                   aliases: [] },
  { prefix: "SAM", name: "Samoan",                   aliases: [] },
  { prefix: "TON", name: "Tongan",                   aliases: [] },
  { prefix: "IND", name: "Indonesian",               aliases: [] },
  { prefix: "ASS", name: "Assembly",                 aliases: ["ASSEMBLY"] },
];
const PREFIX_TO_SUBJECT = new Map(SUBJECTS.map((s) => [s.prefix, s]));
const ALL_PREFIXES = SUBJECTS.map((s) => s.prefix);
// Alias lookup — map every alias (uppercased, alphanumeric only) → prefix
const ALIAS_TO_PREFIX = new Map();
for (const s of SUBJECTS) {
  const nameKey = s.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (nameKey) ALIAS_TO_PREFIX.set(nameKey, s.prefix);
  for (const a of s.aliases) {
    const key = a.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (key) ALIAS_TO_PREFIX.set(key, s.prefix);
  }
}
// Hamming distance for same-length strings (1-char OCR-style tolerance)
function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
// Find the closest known prefix (exact or 1-char off)
function bestPrefix(letters) {
  if (PREFIX_TO_SUBJECT.has(letters)) return letters;
  let best = null;
  let bestDist = 2;
  for (const p of ALL_PREFIXES) {
    if (p.length !== letters.length) continue;
    const d = hamming(p, letters);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best;
}
const SUBJECT_CODE_RX = /[A-Z]{2,4}[123][0-9]{2}/;
// Resolve any text to a canonical subject code, or null.
// Handles:
//   "MAT202"                      → MAT202
//   "mat 202"                     → MAT202
//   "MAT202 Mr Smith Rm 4"        → MAT202
//   "Mathematics"                 → null   (needs level info)
//   "PED202"                      → PED202
//   "MAR2O2"                      → MAR202  (O interpreted as 0 in digits section)
//   "PET202"                      → PED202  (1-char OCR error, PED is nearest prefix)
function resolveSubject(text) {
  if (text == null) return null;
  const raw = String(text).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  // Fast-path: the string contains a properly formatted code somewhere
  const direct = upper.match(SUBJECT_CODE_RX);
  if (direct) {
    const [letters, level, tail] = splitCode(direct[0]);
    if (letters && level && tail) {
      const p = bestPrefix(letters);
      if (p) return `${p}${level}${tail}`;
    }
  }
  // Alphanumeric-only variant — handle "MAR 2 O 2" / "mat2o2" etc.
  const alnum = upper.replace(/[^A-Z0-9]/g, "");
  const swapped = swapLookalikes(alnum);
  const swappedMatch = swapped.match(/[A-Z]{2,4}[123][0-9]{2}/);
  if (swappedMatch) {
    const [letters, level, tail] = splitCode(swappedMatch[0]);
    const p = bestPrefix(letters);
    if (p) return `${p}${level}${tail}`;
  }
  return null;
}
// Split "MAT202" into ["MAT", "2", "02"]
function splitCode(code) {
  const m = code.match(/^([A-Z]{2,4})([123])([0-9]{2})$/);
  if (!m) return [null, null, null];
  return [m[1], m[2], m[3]];
}
// Swap OCR/vision lookalike glyphs so numeric section stays numeric etc.
// We apply the swap only from position where digits should be onwards.
function swapLookalikes(s) {
  // Walk from the right — find the first digit-like run of length >=3
  // and coerce letter-lookalikes to digits within it.
  const digitLike = { O: "0", Q: "0", D: "0", I: "1", L: "1", S: "5", Z: "2", B: "8", G: "6", T: "7" };
  const chars = s.split("");
  for (let i = 0; i < chars.length; i++) {
    // Only coerce the trailing 3 characters
    if (i >= chars.length - 3) {
      if (/[A-Z]/.test(chars[i]) && digitLike[chars[i]]) chars[i] = digitLike[chars[i]];
    }
  }
  return chars.join("");
}
module.exports = {
  SUBJECTS,
  ALL_PREFIXES,
  PREFIX_TO_SUBJECT,
  resolveSubject,
  bestPrefix,
};
