import { helper } from "@ember/component/helper";
import { dasherize } from "@ember/string";

export interface DasherizeHelperSignature {
  Args: {
    Positional: [value: string | undefined];
  };
  Return: string;
}

const dasherizeHelper = helper<DasherizeHelperSignature>(
  ([value]: [string | undefined]) => {
    if (typeof value === "string") {
      return dasherize(value);
    }
    return "";
  }
);

export default dasherizeHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    dasherize: typeof dasherizeHelper;
  }
}
