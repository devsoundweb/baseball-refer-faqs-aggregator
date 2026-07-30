
async function main(): Promise<void> {

    const cmd = process.argv[2] ?? "all";
    console.log(cmd)
    switch(cmd) {
        case "directory":
            console.log("directory");
            break;
        case "player":
            console.log("players");
            break;
        case "aggregate":
            console.log("aggregate");
            break;
        case "all":
            console.log("all");
            break;
        default:
            console.error(`Unkown command ${cmd}. Use: directory | players | aggreage | all`);
            process.exit(1);
    }

}

main().catch((err) => {
    console.error(err);
    process.exit(1);
})