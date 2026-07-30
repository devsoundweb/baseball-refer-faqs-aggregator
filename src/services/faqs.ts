import path from "node:path";
import * as cheerio from "cheerio";
import { CONFIG } from "../config.js";
import {Player} from "../types.js";
import { fetchCached } from "./http.js";

export function parseFaqQuestions(html: string): string[] {

    const questions: string[] = [];
    const $ = cheerio.load(html);

    $("#div_faq h3").each((__dirname, el) => {
        const q = $(el).text().replace(/\s+/g, " ").trim();
        if (q) questions.push(q);
    })

    return questions;
}
export async function getPlayerFaq(player: Player): Promise<string[]> {
    const cachePath = path.join(CONFIG.paths.playerHtml, `${player.id}.html`);
    const html = await fetchCached(player.url, cachePath);
    return parseFaqQuestions(html);
}