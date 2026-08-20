// Stream/timetableBuilder.js
const { resolveSubject } = require("./subjects");
const DEFAULT_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];
const DEFAULT_PERIODS = 5;
const DAY_ALIASES = {
    MON: "Monday",
    MONDAY: "Monday",
    TUE: "Tuesday",
    TUES: "Tuesday",
    TUESDAY: "Tuesday",
    WED: "Wednesday",
    WEDS: "Wednesday",
    WEDNESDAY: "Wednesday",
    THU: "Thursday",
    THURS: "Thursday",
    THURSDAY: "Thursday",
    FRI: "Friday",
    FRIDAY: "Friday"
};
const FREE_LIKE_RX =
    /^(FREE|STUDY|INTERVAL|LUNCH|BREAK|N\/A|NONE|-|—|EMPTY)$/i;
function normaliseSubject(value) {
    if (value == null) return "Free";
    const raw = String(value).trim();
    if (!raw) return "Free";
    const upper = raw
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
    // Assembly MUST be preserved.
    if (
        upper === "ASSEMBLY" ||
        upper === "ASS" ||
        upper === "ASSEMBL" ||
        upper === "ASSEMBLYTIME"
    ) {
        return "Assembly";
    }
    // Tutor Time is NOT a timetable subject.
    if (
        upper === "TUTOR" ||
        upper === "TUTORTIME" ||
        upper === "FORM" ||
        upper === "HOMEROOM" ||
        upper === "WHANAU"
    ) {
        return "Free";
    }
    // Genuine empty cells.
    if (FREE_LIKE_RX.test(raw)) {
        return "Free";
    }
    // Normal NCEA subject.
    const resolved = resolveSubject(raw);
    return resolved || "Free";
}
function normaliseDayKey(key) {
    if (!key) return null;
    const k = String(key)
        .trim()
        .toUpperCase();
    return DAY_ALIASES[k] || null;
}
function normalisePeriodKey(key) {
    if (!key) return null;
    const k = String(key)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");
    const m = k.match(/^(?:PERIOD\s*|P)?([1-9])$/);
    return m ? Number(m[1]) : null;
}
function buildEmptyWeek(days, periodCount) {
    const week = {};
    for (const d of days) {
        week[d] = {};
        for (let i = 1; i <= periodCount; i++) {
            week[d][`Period ${i}`] = "Free";
        }
    }
    return week;
}
function normaliseWeek(raw, options = {}) {
    const days = options.days || DEFAULT_DAYS;
    const periodCount = options.periods || DEFAULT_PERIODS;
    const week = buildEmptyWeek(days, periodCount);
    if (!raw || typeof raw !== "object")
        return week;
    for (const [dayKey, dayValue] of Object.entries(raw)) {
        const day = normaliseDayKey(dayKey);
        if (
            !day ||
            !week[day] ||
            !dayValue ||
            typeof dayValue !== "object"
        ) {
            continue;
        }
        for (const [periodKey, periodValue] of Object.entries(dayValue)) {
            // SPECIAL EVENTS
            if (/^ASSEMBLY$/i.test(periodKey)) {
                week[day]["Assembly"] = "Assembly";
                continue;
            }
            if (/^(TUTOR|TUTOR TIME|FORM|HOMEROOM)$/i.test(periodKey)) {
                week[day]["Tutor Time"] = "Tutor Time";
                continue;
            }
            // NORMAL PERIOD
            const n = normalisePeriodKey(periodKey);
            if (!n || n > periodCount)
                continue;
            const value = normaliseSubject(periodValue);
            week[day][`Period ${n}`] = value;
        }
    }
    return week;
}
function buildTimetable(input, options = {}) {
    const out = {};
    if (input && input.week1)
        out.week1 = normaliseWeek(input.week1, options);
    if (input && input.week2)
        out.week2 = normaliseWeek(input.week2, options);
    if (!out.week1 && !out.week2 && input && typeof input === "object") {
        out.week1 = normaliseWeek(input, options);
    }
    return out;
}
module.exports = {
    buildTimetable,
    normaliseWeek,
    normaliseSubject,
    DEFAULT_DAYS,
    DEFAULT_PERIODS
};