import { helper } from "@ember/component/helper";
import { HermesDocument } from "hermes/types/document";

interface HasReviewedDocHelperSignature {
  Args: {
    Positional: [document: HermesDocument, reviewerEmail: string];
  };
  Return: boolean;
}

const hasReviewedDocHelper = helper<HasReviewedDocHelperSignature>(
  ([document, reviewerEmail]: [HermesDocument, string]) => {
    if (document.reviewedBy) {
      return document.reviewedBy.some((email) => email === reviewerEmail);
    } else {
      return false;
    }
  }
);

export default hasReviewedDocHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "has-reviewed-doc": typeof hasReviewedDocHelper;
  }
}
