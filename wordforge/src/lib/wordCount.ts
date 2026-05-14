export type WordCountMode = "characters" | "noSpaces" | "mixedWords";

export const WORD_COUNT_MODE_LABELS: Record<WordCountMode, string> = {
  characters: "字符",
  noSpaces: "不计空白",
  mixedWords: "中英混合",
};

export function countWritingText(text: string, mode: WordCountMode) {
  switch (mode) {
    case "noSpaces":
      return Array.from(text).filter((char) => !/\s/u.test(char)).length;
    case "mixedWords":
      return countMixedWords(text);
    case "characters":
    default:
      return Array.from(text).filter((char) => char !== "\n").length;
  }
}

function countMixedWords(text: string) {
  const latinWords = text.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
  const cjkChars = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
  return latinWords + cjkChars;
}
