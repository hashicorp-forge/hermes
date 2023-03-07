import replaceSpecialCharacters from "replace-special-characters";

export default function cleanString(string: string): string {
  // ‘, ’, ‚
  let newString = string.replace(/[\u2018\u2019\u201A]/g, "'");
  // “, ”, „
  newString = newString.replace(/[\u201C\u201D\u201E]/g, '"');
  // …
  newString = newString.replace(/\u2026/g, "...");
  // –
  newString = newString.replace(/\u2013/g, "-");
  // —
  newString = newString.replace(/\u2014/g, "--");
  // •, ·
  newString = newString.replace(/[\u2022\u00B7]/g, "*");
  // «
  newString = newString.replace(/\u00AB/g, "<<");
  // »
  newString = newString.replace(/\u00BB/g, ">>");
  // ‹
  newString = newString.replace(/\u2039/g, "<");
  // ›
  newString = newString.replace(/\u203A/g, ">");
  // ¢
  newString = newString.replace(/\u00A2/g, "c");
  // ©
  newString = newString.replace(/\u00A9/g, "(C)");
  // ™
  newString = newString.replace(/\u2122/g, "(TM)");
  // ®
  newString = newString.replace(/\u00AE/g, "(R)");
  // °
  newString = newString.replace(/\u00B0/g, "(deg)");
  // ±
  newString = newString.replace(/\u00B1/g, "+/-");
  // ×
  newString = newString.replace(/\u00D7/g, "*");
  // ÷
  newString = newString.replace(/\u00F7/g, "/");
  // ¼
  newString = newString.replace(/\u00BC/g, "1/4");
  // ½
  newString = newString.replace(/\u00BD/g, "1/2");
  // ¾
  newString = newString.replace(/\u00BE/g, "3/4");
  // √
  newString = newString.replace(/\u221A/g, "sqrt");
  // ¹
  newString = newString.replace(/\u00B9/g, "^1");
  // ²
  newString = newString.replace(/\u00B2/g, "^2");
  // ³
  newString = newString.replace(/\u00B3/g, "^3");
  // ⁿ
  newString = newString.replace(/\u207F/g, "^n");
  // ¿
  newString = newString.replace(/\u00BF/g, "?");
  // ¡
  newString = newString.replace(/\u00A1/g, "!");
  // ≥
  newString = newString.replace(/\u2265/g, ">=");
  // ≤
  newString = newString.replace(/\u2264/g, "<=");
  // ≠
  newString = newString.replace(/\u2260/g, "!=");

  // replace special characters e.g., é with e
  newString = replaceSpecialCharacters(newString);

  // remove non-ascii characters
  newString = newString.replace(/[^\x00-\x7F]/g, "");

  return newString;
}
