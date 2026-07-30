import { CONFIG } from "../config.js";
import { Player } from "../types.js";
import path from "node:path";
import { fetchCached } from "./http.js";
import * as cheerio from "cheerio";

export async function parseDirectoryHtml(html: string, letter: string): Promise<Player[]> {
    const players: Player[] = [];
    const $ = cheerio.load(html);
    const seen = new Set<string>();

    $("#div_players_ p a").each((_, el) => {
        const href = $(el).attr("href");
        const name = $(el).text().trim();
        if (!href || !name) return;

        const match = href.match(/\/players\/[a-z]\/([^/]+)\.shtml$/);
        if (!match) return;
        const id = match[1]!;

        if (seen.has(id)) return;
        seen.add(id);

        players.push({
            id,
            name,
            url: new URL(href, CONFIG.baseUrl).toString()
        })
    })

    return players;
}
export async function getPlayersByLetter(letter: string): Promise<Player[]> {
    const url = `${CONFIG.baseUrl}/players/${letter}/`;
    const cachePath = path.join(CONFIG.paths.directoryHtml, `${letter}.html`);
    const html = await fetchCached(url, cachePath);

    const players: Player[] = await parseDirectoryHtml(html, letter);
    return players;
    
}
export async function getAllPlayers(): Promise<Player[]> {
 const all: Player[] = [];

 for (const letter of CONFIG.letters) {
    const players = await getPlayersByLetter(letter);
    all.push(...players);
 }
 return all;
}