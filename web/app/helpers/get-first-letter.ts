import { helper } from "@ember/component/helper";

export interface GetFirstLetterSignature {
  Args: {
    Positional: [maybeString: string | null | undefined];
  };
  Return: string | null;
}

const getFirstLetter = helper<GetFirstLetterSignature>(
  ([maybeString]: [string | null | undefined | number]) => {
    if (typeof maybeString === "string") {
      return maybeString.match(/[a-zA-Z]/)?.[0] ?? null;
    }
    return null;
  }
);

export default getFirstLetter;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-first-letter": typeof getFirstLetter;
  }
}
