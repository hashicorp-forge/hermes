import { helper } from "@ember/component/helper";
import { HermesDocument } from "hermes/types/document";

interface HasApprovedDocHelperSignature {
  Args: {
    Positional: [document: HermesDocument, approverEmail: string];
  };
  Return: boolean;
}

const hasApprovedDocHelper = helper<HasApprovedDocHelperSignature>(
  ([document, approverEmail]: [HermesDocument, string]) => {
    if (document.approvedBy) {
      return document.approvedBy.some((email) => email === approverEmail);
    } else {
      return false;
    }
  }
);

export default hasApprovedDocHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "has-approved-doc": typeof hasApprovedDocHelper;
  }
}
