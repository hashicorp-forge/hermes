import { helper } from "@ember/component/helper";
import parseDate from "hermes/utils/parse-date";
export interface ParseDateHelperSignature {
  Args: {
    Positional: [
      time: string | number | Date | undefined,
      monthFormat?: "short" | "long"
    ];
    Return: Date | undefined;
  };
}

const parseDateHelper = helper<ParseDateHelperSignature>(
  ([time, monthFormat = "short"]) => {
    return parseDate(time, monthFormat);
  }
);

export default parseDateHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "parse-date": typeof parseDateHelper;
  }
}
