import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, "..");

export const CONFIG = {
    baseUrl: "https://www.baseball-reference.com",

    // (https://www.baseball-reference.com/players/<letter>/)
    letters: "abcdefghijklmnopqrstuvwxyz".split(""),

    // Fold accents/diacritics (e.g. "á" -> "a") before counting 'a's.
    // See README/debrief: this is a documented interpretation decision.
    foldDiacritics: true,
    
    targetLetter: "a",
    targetCount: 3,

    paths: {
        data: path.join(ROOT, "data"),
        directoryHtml: path.join(ROOT, "data", "directory"),
        playerHtml: path.join(ROOT, "data", "players"),
        output: path.join(ROOT, "output"),
    },

    http: {
        userAgent:
            "bbref-faq-aggregator/1.0 (take-home assessment; contact: candidate)",
        // Polite crawl settings. baseball-reference rate-limits aggressively and
        // returns HTTP 429 when pushed, so we default to a slow, serial crawl.
        minDelayMs: Number(process.env.BBREF_DELAY_MS ?? 3000),
        maxRetries: Number(process.env.BBREF_MAX_RETRIES ?? 5),
        timeoutMs: Number(process.env.BBREF_TIMEOUT_MS ?? 30000),
    },
} as const;