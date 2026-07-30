# Baseball-Reference FAQ Aggregator

Finds every MLB player on [baseball-reference.com](https://www.baseball-reference.com/players/a/)
whose **full name contains exactly three `a`s** and aggregates the **unique
FAQ questions** that appear across those players' pages.

Written in **Node + TypeScript**.

---

## What it does

1. **Directory scrape** — downloads all 26 letter index pages
   (`/players/a/` … `/players/z/`) and extracts every player (name + page URL).
2. **Filter** — keeps only players whose name has exactly 3 `a`s
   (case-insensitive; accents folded, so `á` counts as `a`).
   - `David Aardsma` → 4 `a`s → **excluded**
   - `Tal Abernathy` → 3 `a`s → **included**
3. **Player scrape** — downloads each matched player's page and pulls the
   questions out of the **Frequently Asked Questions** section (`#div_faq h3`).
4. **Aggregate** — groups questions that are "the same" (ignoring casing and the
   player's name) and reports, for each unique question, how many players it
   appeared on.

Two questions are considered identical when they differ only by casing or by the
player's name, e.g.
`"When was David Aardsma born?"` ≡ `"When was Henry Aaron born?"`.
This is implemented by lowercasing, folding diacritics, and replacing every
occurrence of the player's name (full name and its parts) with a `{name}`
placeholder before comparing.

---

## Requirements

- Node.js **>= 20** (uses the built-in global `fetch`)
- npm

## Install

```bash
npm install
```

## Run

Run the whole pipeline:

```bash
npm run all
```

Or run the stages individually (each caches its work, so stages are resumable):

```bash
npm run scrape:players   # -> output/matched-players.json
npm run scrape:faqs     # -> output/player-faqs.json   (slow; see below)
npm run aggregate          # -> output/faq-aggregate.json + console summary
```

Type-check and unit tests (normalization / `a`-counting logic):

```bash
npm run typecheck
npm test
```

### Tuning the crawl

baseball-reference rate-limits aggressively, so the crawler is **serial and
slow by default** (3s between requests, with exponential backoff + `Retry-After`
handling on HTTP 429/5xx). Override via env vars:

| Env var             | Default | Meaning                          |
| ------------------- | ------- | -------------------------------- |
| `BBREF_DELAY_MS`    | `3000`  | Min delay between requests (ms)  |
| `BBREF_MAX_RETRIES` | `5`     | Retries per request              |
| `BBREF_TIMEOUT_MS`  | `30000` | Per-request timeout (ms)         |

Fetching ~900 player pages takes roughly 45–60 minutes at the default delay.
The brief notes long runtimes are acceptable.

---

## Caching / resumability

Every downloaded page is cached to `data/` (git-ignored):

- `data/directory/<letter>.html`
- `data/players/<id>.html`

Re-running any stage reads from the cache instead of hitting the network, so you
can iterate on parsing/aggregation logic offline. The player stage also
checkpoints `output/player-faqs.json` every 25 players, so an interrupted run
loses almost nothing and can be resumed by simply running it again.

---

## Output

The headline deliverable is **`output/faq-aggregate.json`**:

```jsonc
{
  "generatedAt": "…",
  "criteria": {
    "targetACount": 3,
    "foldDiacritics": true,
    "sameQuestion": "case-insensitive and player-name-insensitive"
  },
  "totalPlayersAggregated": 899,
  "totalUniqueQuestions": 12,
  "questions": [
    {
      "question": "When was [player] born?",
      "normalized": "when was {name} born?",
      "playerCount": 899,
      "players": ["abadan01", "abadfe01", "…"]
    }
    // …
  ]
}
```

Supporting artifacts:

- `output/matched-players.json` — the filtered player list (with `aCount`).
- `output/player-faqs.json` — raw FAQ questions per matched player (for
  debugging / posterity).

---

## Project layout

```
src/
  config.ts      # tunables, paths, crawl settings
  http.ts        # cached fetch w/ rate-limiting, retries, backoff
  names.ts       # 'a'-counting + diacritic folding
  directory.ts   # fetch + parse the 26 index pages
  player.ts      # fetch + parse a player's FAQ section
  aggregate.ts   # question normalization + aggregation
  index.ts       # CLI orchestration (directory | players | aggregate | all)
```

---

## Key assumptions / decisions

- **Name source**: the player's name is the anchor text in the directory listing
  (e.g. `Ronald Acuña Jr.`). `a`s are counted over that full string, including
  any suffix like `Jr.`.
- **Accents count**: `á`/`ä`/etc. fold to `a` before counting. This felt like
  the intended reading of "how many a's are in the name" and matters because
  baseball-reference uses accented spellings. Toggle with
  `CONFIG.foldDiacritics`.
- **"Same question"**: normalized by casing + name removal only; punctuation and
  wording are otherwise preserved.
