import { CONFIG } from "../config.js";
import { Player } from "../types.js";
import path from "node:path";
import { fetchCached } from "./http.js";

export async function parseDirectoryHtml(html: string, letter: string): Promise<Player[]> {
    const players: Player[] = [];

    return players;
}
export async function getPlayersByLetter(letter: string): Promise<Player[]> {
    const url = `${CONFIG.baseUrl}/players/${letter}/`;
    const cachePath = path.join(CONFIG.paths.directoryHtml, `${letter}.html`);
    const html = await fetchCached(url, cachePath);

    return parseDirectoryHtml(html, letter);
    
}
export async function getAllPlayers(): Promise<Player[]> {
 const all: Player[] = [];

 for (const letter of CONFIG.letters) {
    const players = await getPlayersByLetter(letter);
    all.push(...players);
 }
 return all;
}