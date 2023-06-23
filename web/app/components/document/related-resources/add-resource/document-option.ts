import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface DocumentRelatedResourcesAddResourceDocumentOptionComponentSignature {
  Args: {
    document: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentRelatedResourcesAddResourceDocumentOptionComponent extends Component<DocumentRelatedResourcesAddResourceDocumentOptionComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::RelatedResources::AddResource::DocumentOption": typeof DocumentRelatedResourcesAddResourceDocumentOptionComponent;
  }
}
