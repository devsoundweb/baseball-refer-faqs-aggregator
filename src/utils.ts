import { CONFIG } from "./config.js";

/** Remove diacritics so e.g. "á"/"ä" fold down to a plain "a". */
export function foldDiacritics(input: string): string {
  return input.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

//Count the number of certain letter in player's name (case-insensitive)
export function countLetter(name: string, letter: string): number {

    const normalized = CONFIG.foldDiacritics ? foldDiacritics(name) : name;
    const matches = normalized.toLocaleLowerCase().match(new RegExp(letter, "g"));
    return matches ? matches.length : 0;
}

export function hasExactCount(name: string, letter = CONFIG.targetLetter, target = CONFIG.targetCount ): boolean {

    return countLetter(name, letter) === target;
}