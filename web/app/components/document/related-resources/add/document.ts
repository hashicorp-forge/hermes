import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface DocumentRelatedResourcesAddDocumentComponentSignature {
  Args: {
    document: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentRelatedResourcesAddDocumentComponent extends Component<DocumentRelatedResourcesAddDocumentComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::RelatedResources::Add::Document": typeof DocumentRelatedResourcesAddDocumentComponent;
  }
}
