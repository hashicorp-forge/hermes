import Component from "@glimmer/component";
import type { HermesDocument } from "hermes/types/document";

interface RelatedResourcesAddDocumentComponentSignature {
  Args: {
    document: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class RelatedResourcesAddDocumentComponent extends Component<RelatedResourcesAddDocumentComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResources::Add::Document": typeof RelatedResourcesAddDocumentComponent;
  }
}
