// Finds the times in a recipe step ("bake 25 minutes", "simmer 1 1/2 hours",
// "10 to 12 min") so cook mode can offer a timer for each one.

export type FoundTimer = { label: string; seconds: number };

const UNITS: Record<string, number> = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
};

const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, sixty: 60, ninety: 90,
};

// "1", "1.5", "1 1/2", "1½", "½", or a number word.
const NUM = String.raw`(\d+(?:\.\d+)?(?:\s+\d\/\d|\s*[½¼¾])?|\d\/\d|[½¼¾]|${Object.keys(WORDS).join("|")})`;
const UNIT = String.raw`(seconds?|secs?|minutes?|mins?|hours?|hrs?|h|m|s)\b`;
// An optional range: "10 to 12", "10-12", "10–12", "10 or 12".
const PATTERN = new RegExp(String.raw`\b${NUM}(?:\s*(?:-|–|—|to|or)\s*${NUM})?\s*(?:-\s*)?${UNIT}`, "gi");

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75 };

function toNumber(text: string): number {
  const t = text.trim().toLowerCase();
  if (t in WORDS) return WORDS[t]!;
  let total = 0;
  for (const part of t.split(/\s+/)) {
    const glyph = /^(\d*)([½¼¾])$/.exec(part);
    if (glyph) total += Number(glyph[1] || 0) + FRACTIONS[glyph[2]!]!;
    else if (/^\d\/\d$/.test(part)) {
      const [a, b] = part.split("/").map(Number);
      total += a! / b!;
    } else total += Number(part);
  }
  return total;
}

/** "25 min", "1 hr 30 min", "45 sec". */
export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * Every time in the text, in order, without repeats. A range gives its lower
 * end, so the timer goes off when it's time to check. Times under 10 seconds
 * or over 24 hours are skipped (they're rarely meant as timers).
 */
export function findTimers(text: string): FoundTimer[] {
  const found: FoundTimer[] = [];
  for (const match of text.matchAll(PATTERN)) {
    const unit = UNITS[match[3]!.toLowerCase()];
    if (!unit) continue;
    // A one-letter unit counts only right after a digit: "15m" yes, "2 m of string" no.
    if (match[3]!.length === 1 && !/\d$/.test(match[0]!.slice(0, -1))) continue;
    const seconds = Math.round(toNumber(match[1]!) * unit);
    if (!Number.isFinite(seconds) || seconds < 10 || seconds > 86_400) continue;
    if (found.some((t) => t.seconds === seconds)) continue;
    found.push({ label: durationLabel(seconds), seconds });
  }
  return found;
}
