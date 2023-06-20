import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface InputsDocumentSelectRelatedResourcesOptionSignature {
  Args: {
    document: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class InputsDocumentSelectRelatedResourcesOption extends Component<InputsDocumentSelectRelatedResourcesOptionSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::RelatedResourcesOption": typeof InputsDocumentSelectRelatedResourcesOption;
  }
}
