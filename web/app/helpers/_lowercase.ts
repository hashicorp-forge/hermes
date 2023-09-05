import { helper } from "@ember/component/helper";

export interface LowercaseHelperSignature {
  Args: {
    Positional: [value: string | number | boolean | undefined];
  };
  Return: string;
}

const lowercaseHelper = helper<LowercaseHelperSignature>(
  ([value]: [string | number | boolean | undefined]) => {
    return value?.toString().toLowerCase() ?? "";
  }
);

export default lowercaseHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    lowercase: typeof lowercaseHelper;
  }
}
