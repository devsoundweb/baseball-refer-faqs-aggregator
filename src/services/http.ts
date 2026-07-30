import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../config.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequestAt = 0;

// Enforce a minimum dealy between outbound request to prevent rate limit error
async function throttle(): Promise<void> {
    const now = Date.now();
    const wait = CONFIG.http.minDelayMs - (now - lastRequestAt);

    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
}
export async function fileExist(path: string): Promise<Boolean> {

    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }

}

export async function fetchCached(url: string, cachePath: string): Promise<string> {

    const isExist = await fileExist(cachePath);
    if (isExist) {
        return fs.readFile(cachePath, "utf8");
    }
    const html = await fetchWithRetry(url);

    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, html, "utf-8");

    return html;
}

export async function fetchWithRetry(url: string): Promise<string> {

    const { maxRetries, timeoutMs, userAgent } = CONFIG.http;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await throttle();

        try {
            const contoller = new AbortController();
            const timer = setTimeout(() => contoller.abort(), timeoutMs);

            const res = await fetch(url, {
                headers: {
                    "User-Agent": userAgent,
                    Accept: "text/html, application/xhtml+xml"
                },
                signal: contoller.signal
            });
            clearTimeout(timer);

            //If rate limit error occurs, retry after backoff time.
            if (res.status === 429 || res.status >= 500) {
                const retryAfter = Number(res.headers.get("retry-after"));
                const backoff = Number.isFinite(retryAfter) && retryAfter > 0
                    ? retryAfter * 1000
                    : Math.min(60000, 2000 * 2 ** (attempt - 1));
                console.warn(
                    `  [http] ${res.status} for ${url} — backing off ${Math.round(
                        backoff / 1000,
                    )}s (attempt ${attempt}/${maxRetries})`,
                );
                await sleep(backoff);
                continue;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

            return await res.text();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (attempt === maxRetries) {
                throw new Error(`Failed to fetch ${url}: ${message}`);
            }
            const backoff = Math.min(60000, 2000 * 2 ** (attempt - 1));
            console.warn(
                `  [http] error for ${url}: ${message} — retry in ${Math.round(
                    backoff / 1000,
                )}s (attempt ${attempt}/${maxRetries})`,
            );
            await sleep(backoff);
        }
    }
    throw new Error(`Exhausted retries for ${url}`);

}