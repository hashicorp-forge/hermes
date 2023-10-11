import { helper } from "@ember/component/helper";

export interface GetDoctypeIconSignature {
  Args: {
    Positional: [string];
  };
  Return: string;
}

const getDoctypeIconHelper = helper<GetDoctypeIconSignature>(
  ([docTypeName]) => {
    switch (docTypeName.toLowerCase()) {
      case "rfc":
        return "discussion-circle";
      case "prd":
        return "target";
      case "frd":
        return "dollar-sign";
      case "memo":
        return "radio";
      default:
        return "file-text";
    }
  },
);

export default getDoctypeIconHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-doctype-icon": typeof getDoctypeIconHelper;
  }
}
