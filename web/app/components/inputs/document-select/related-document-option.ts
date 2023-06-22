import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface InputsDocumentSelectRelatedDocumentOptionSignature {
  Args: {
    document: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class InputsDocumentSelectRelatedDocumentOption extends Component<InputsDocumentSelectRelatedDocumentOptionSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::RelatedDocumentOption": typeof InputsDocumentSelectRelatedDocumentOption;
  }
}
