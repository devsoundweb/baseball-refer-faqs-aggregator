import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "./config.js";
import { getAllPlayers } from "./services/player.js";
import { Player, PlayerFAQ } from "./types.js";
import { getPlayerFaq } from "./services/faqs.js";
import { hasExactCount } from "./utils.js";
import { aggregateQuestions } from "./services/aggregate.js";

const OUT = CONFIG.paths.output;
const MATCHED_FILE = path.join(OUT, "matched-players.json");
const FAQ_FILE = path.join(OUT, "player-faqs.json");
const AGG_FILE = path.join(OUT, "faq-aggregate.json");


async function writeJsonFile(p: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

async function readJsonFile<T>(p: string): Promise<T> {
    return JSON.parse(await fs.readFile(p, "utf8")) as T;
}

// Scrape all players from web pages
async function scrapePlayers(): Promise<Player[]> {

    console.log("--- Step 1: Scrape all players ----");

    const all = await getAllPlayers();
    console.log(`${all.length} players were founded.`)

    const letter = CONFIG.targetLetter;
    const count = CONFIG.targetCount;

    const matched = all.filter((p) => hasExactCount(p.name))
                    .map((p) => ({...p, letter, count}));
    console.log(`${matched.length} players have exactly ${count} '${letter}'s`)
    await writeJsonFile(MATCHED_FILE, {
        generatedAt: new Date().toISOString(),
        criteria: {
            targetLetter: "a",
            targetCount: 3,
            foldDiacritics: CONFIG.foldDiacritics
        },
        totalCount: all.length,
        totalMatched: matched.length,
        players: matched
    })
    return matched;
}

// fetch each matched player's page and extract FAQ questions
async function scrapeFAQ(): Promise<PlayerFAQ[]> {

    console.log("--- Scrape player FAQs ---");
    const { players } = await readJsonFile<{ players: Player[] }>(MATCHED_FILE);
    const faqs: PlayerFAQ[] = [];

    for(let i = 0 ; i < players.length; i++) {
     const p: Player = players[i]!;
        try {
            console.log(`Fetching ${p.name}'s FAQ question.`);
            const questions = await getPlayerFaq(p);
            faqs.push({id: p.id, name: p.name, questions});

            if ( (i+1) % 25 == 0 || i + 1 === players.length) {
                console.log(`[players]${i+1}/${players.length} fetched`);
                await writeJsonFile(FAQ_FILE, faqs);
            }
            
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`  [players] FAILED ${p.id} (${p.name}): ${msg}`);
        }
    }

    await writeJsonFile(FAQ_FILE, faqs);
    const withFaq = faqs.filter((f) => f.questions.length > 0).length;
    console.log(`\nFetched ${faqs.length} players (${withFaq} players had a FAQ section).`);
    
    return faqs;
}

//
async function aggregateFAQs(): Promise<void> {
    console.log("--- Aggregating FAQs ---");

    const faqs = await readJsonFile<PlayerFAQ[]>(FAQ_FILE);
    const result = aggregateQuestions(faqs);

    writeJsonFile(AGG_FILE, {
        generateAt: new Date().toISOString(),
        criteria: {
            targetLetter: CONFIG.targetLetter,
            targetCount: CONFIG.targetCount,
            sameQuestion: "case-insensitive and player-name-insensitive",
        },
        totalPlayersAggregated: result.totalPlayersAggregated,
        totalUniqueQuestions: result.totalUniqueQuestions,
        questions: result.questions
    })
}
async function main(): Promise<void> {

    const cmd = process.argv[2] ?? "all";

    switch (cmd) {
        case "player":
            console.log("player");
            await scrapePlayers();
            break;
        case "faq":
            await scrapeFAQ();
            break;
        case "aggregate":
            console.log("aggregate");
            await aggregateFAQs();
            break;
        case "all":
            console.log("all");
            break;
        default:
            console.error(`Unkown command ${cmd}. Use: player | faq | aggreage | all`);
            process.exit(1);
    }

}

main().catch((err) => {
    console.error(err);
    process.exit(1);
})