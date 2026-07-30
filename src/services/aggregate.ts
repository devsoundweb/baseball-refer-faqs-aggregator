import { foldDiacritics } from "../utils.js";
import {PlayerFAQ} from "../types.js";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Normalize curly/modifier apostrophes to a plain ASCII apostrophe. */
const normalizeApostrophes = (s: string) =>
  s.replace(/[\u2018\u2019\u02BC]/g, "'");

/** Separator characters allowed *between* name parts inside a name run. */
const SEP = "[\\s.'\\-]+";

/** Alphanumeric name parts, diacritics folded, e.g. "Ronald Acuña Jr." -> [ronald,acuna,jr]. */
function nameParts(playerName: string): string[] {
  const folded = normalizeApostrophes(foldDiacritics(playerName)).toLowerCase();
  return folded.match(/[a-z0-9]+/g) ?? [];
}

/**
 * Replace every occurrence of a player's name with `placeholder`.
 *
 * @param lower when true (grouping key) the text is lowercased; when false
 *              (display template) original casing is preserved.
 */
function stripName(
  text: string,
  playerName: string,
  placeholder: string,
  lower: boolean,
): string {
  let q = normalizeApostrophes(foldDiacritics(text));
  if (lower) q = q.toLowerCase();

  const parts = nameParts(playerName);
  const flags = lower ? "g" : "gi";
  // Optionally consume a trailing period (suffix like "Jr.") and/or a
  // possessive ("'s" or "'"), e.g. "Jr.'s", "Aardsma's", "Abrams'".
  const trailer = "\\.?(?:'s?)?";

  if (parts.length) {
    const full = parts.map(escapeRegExp).join(SEP);
    q = q.replace(
      new RegExp(`(?<![a-z0-9])${full}${trailer}(?![a-z0-9])`, flags),
      placeholder,
    );
    for (const p of parts
      .filter((p) => p.length >= 3)
      .sort((a, b) => b.length - a.length)) {
      q = q.replace(
        new RegExp(`(?<![a-z0-9])${escapeRegExp(p)}${trailer}(?![a-z0-9])`, flags),
        placeholder,
      );
    }
  }

  // Collapse consecutive placeholders (possibly separated) into one.
  const ph = escapeRegExp(placeholder);
  q = q.replace(new RegExp(`${ph}(?:${SEP}?${ph})+`, "g"), placeholder);
  q = q.replace(/\s+([?!.,;:])/g, "$1"); // tidy space before punctuation
  q = q.replace(/\s+/g, " ").trim();
  return q;
}

/**
 * Canonical grouping key for a FAQ question. Per the brief, two questions are
 * "the same" if they differ only by casing or by the player's name.
 */
export function normalizeQuestion(question: string, playerName: string): string {
  return stripName(question, playerName, "{name}", true);
}

/** Readable, name-agnostic template of a question (keeps original casing). */
export function templateQuestion(question: string, playerName: string): string {
  return stripName(question, playerName, "[player]", false);
}

export interface QuestionAggregate {
  question: string;
  normalized: string;
  playerCount: number;
  players: string[];
}

export interface AggregateResult {
  totalPlayersAggregated: number;
  totalUniqueQuestions: number;
  questions: QuestionAggregate[];
}

/** Aggregate unique FAQ questions across all matched players. */
export function aggregateQuestions(playerFaqs: PlayerFAQ[]): AggregateResult {
  const groups = new Map<string, { template: string; players: Set<string> }>();

  for (const pf of playerFaqs) {
    // De-dup within a single player so one player counts a question once.
    const seenForPlayer = new Set<string>();
    for (const raw of pf.questions) {
      const key = normalizeQuestion(raw, pf.name);
      console.log(key);
      if (!key || seenForPlayer.has(key)) continue;
      seenForPlayer.add(key);

      let group = groups.get(key);
      if (!group) {
        group = { template: templateQuestion(raw, pf.name), players: new Set() };
        groups.set(key, group);
      }
      group.players.add(pf.id);
    }
  }

  const questions: QuestionAggregate[] = [...groups.entries()]
    .map(([normalized, g]) => ({
      question: g.template,
      normalized,
      playerCount: g.players.size,
      players: [...g.players].sort(),
    }))
    .sort(
      (a, b) =>
        b.playerCount - a.playerCount || a.normalized.localeCompare(b.normalized),
    );

  return {
    totalPlayersAggregated: playerFaqs.length,
    totalUniqueQuestions: questions.length,
    questions,
  };
}
