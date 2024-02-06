import { helper } from "@ember/component/helper";
import { HermesDocument } from "hermes/types/document";

interface HasRejectedDocHelperSignature {
  Args: {
    Positional: [document: HermesDocument, email: string];
  };
  Return: boolean;
}

const hasRejectedDocHelper = helper<HasRejectedDocHelperSignature>(
  ([document, email]: HasRejectedDocHelperSignature["Args"]["Positional"]) => {
    return !!document.changesRequestedBy?.includes(email);
  },
);

export default hasRejectedDocHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "has-rejected-doc": typeof hasRejectedDocHelper;
  }
}
