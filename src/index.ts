import {CONFIG} from "./config.js";
import { getAllPlayers } from "./services/player.js";
import {Player} from "./types.js";

async function scrapePlayers(): Promise<Player[]> {

    console.log("--- Step 1: Scrape all players ----");

    const all = await getAllPlayers();

    const matched = all;

    return matched;
}

async function main(): Promise<void> {

    const cmd = process.argv[2] ?? "all";

    switch(cmd) {
        case "player":
            console.log("player");
            await scrapePlayers();
            break;
        case "faq":
            console.log("faq");
            break;
        case "aggregate":
            console.log("aggregate");
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