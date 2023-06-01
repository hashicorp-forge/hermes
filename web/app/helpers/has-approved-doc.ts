import { helper } from "@ember/component/helper";
import { HermesDocument } from "hermes/types/document";

export interface HasApprovedDocSignature {
  Args: {
    Positional: [HermesDocument, string];
  };
  Return: boolean;
}

const hasApprovedDoc = helper<HasApprovedDocSignature>(
  ([document, approverEmail]: [HermesDocument, string]) => {
    if (document.approvedBy) {
      return document.approvedBy.some((email) => email === approverEmail);
    } else {
      return false;
    }
  }
);

export default hasApprovedDoc;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "has-approved-doc": typeof hasApprovedDoc;
  }
}
