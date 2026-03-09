import Helper from "@ember/component/helper";
import { htmlSafe } from "@ember/template";
import type { ContentValue } from "@glint/template";

interface HighlightTextHelperSignature {
  Args: {
    Positional: [fullText: string, textToHighlight?: string];
  };
  Return: ContentValue;
}
/**
 * A helper that highlights text matching a given string.
 * We finds all matches and wraps them in a <mark> tag.
 */
export default class HighlightTextHelper extends Helper<HighlightTextHelperSignature> {
  compute(positional: HighlightTextHelperSignature["Args"]["Positional"]) {
    let [fullText, textToHighlight] = positional;

    if (!textToHighlight) return fullText;

    try {
      /**
       * Note: `gi` means global and case-insensitive.
       */
      const regex = new RegExp(`(${textToHighlight.toString()})`, "gi");

      return htmlSafe(
        fullText.replace(regex, (match) => `<mark>${match}</mark>`),
      );
    } catch {
      /**
       * If regex errors, such as when a special character is used,
       * return the full text without highlighting.
       * TODO: Improve this
       */
      return fullText;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "highlight-text": typeof HighlightTextHelper;
  }
}
