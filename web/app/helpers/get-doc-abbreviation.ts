import { helper } from "@ember/component/helper";

export interface GetDocAbbreviationHelperSignature {
  Args: {
    Positional: [docNumber: string];
  };
  Return: string;
}
const getDocAbbreviation = helper<GetDocAbbreviationHelperSignature>(
  ([docNumber]: [string]) => {
    const nameParts = docNumber.split("-");
    const abbreviation = nameParts[0];

    if (abbreviation) {
      return abbreviation.slice(0, 3).toUpperCase();
    }

    return "";
  }
);

export default getDocAbbreviation;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-doc-abbreviation": typeof getDocAbbreviation;
  }
}
