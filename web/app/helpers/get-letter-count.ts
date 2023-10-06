import { helper } from "@ember/component/helper";

export interface GetLetterCountHelperSignature {
  Args: {
    Positional: [text: string];
  };
  Return: string | null;
}
const getLetterCount = helper<GetLetterCountHelperSignature>(
  ([text]: [string]) => {
    return text.length.toString();
  },
);

export default getLetterCount;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-letter-count": typeof getLetterCount;
  }
}
