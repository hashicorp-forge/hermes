import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface DocumentSidebarRelatedResourcesAddDocumentComponentSignature {
  Args: {
    document: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesAddDocumentComponent extends Component<DocumentSidebarRelatedResourcesAddDocumentComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add::Document": typeof DocumentSidebarRelatedResourcesAddDocumentComponent;
  }
}
