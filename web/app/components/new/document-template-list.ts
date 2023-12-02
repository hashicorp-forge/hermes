import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import FlagsService from "hermes/services/flags";
import { HermesDocumentType } from "hermes/types/document-type";

interface NewDocumentTemplateListComponentSignature {
  Args: {
    docTypes: HermesDocumentType[];
  };
}

export default class NewDocumentTemplateListComponent extends Component<NewDocumentTemplateListComponentSignature> {
  /**
   * Used in the template to decide whether to show
   * the "Start a project" button.
   */
  @service declare flags: FlagsService;

  protected get moreInfoLinksAreShown(): boolean {
    return this.args.docTypes.some((docType) => docType.moreInfoLink);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::DocumentTemplateList": typeof NewDocumentTemplateListComponent;
  }
}
