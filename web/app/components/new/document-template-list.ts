import Component from "@glimmer/component";
import { HermesDocumentType } from "hermes/types/document-type";

interface NewDocumentTemplateListComponentSignature {
  Args: {
    docTypes: HermesDocumentType[];
  };
}

export default class NewDocumentTemplateListComponent extends Component<NewDocumentTemplateListComponentSignature> {
  protected get moreInfoLinksAreShown(): boolean {
    return this.args.docTypes.some((docType) => docType.moreInfoLink);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::DocumentTemplateList": typeof NewDocumentTemplateListComponent;
  }
}
