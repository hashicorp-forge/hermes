import { service } from "@ember/service";
import Component from "@glimmer/component";
import DocumentTypesService from "hermes/services/document-types";

interface NewDocumentTemplateListComponentSignature {}

export default class NewDocumentTemplateListComponent extends Component<NewDocumentTemplateListComponentSignature> {
  @service declare documentTypes: DocumentTypesService;

  protected get moreInfoLinksAreShown(): boolean {
    return !!this.documentTypes.index?.some((docType) => docType.moreInfoLink);
  }

  protected get docTypes() {
    return this.documentTypes.index;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::DocumentTemplateList": typeof NewDocumentTemplateListComponent;
  }
}
