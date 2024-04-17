import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import DocumentTypesService from "hermes/services/document-types";
import { HermesDocumentType } from "hermes/types/document-type";

interface AdminDoctypesFormSignature {
  Element: null;
  Args: {
    doctype?: HermesDocumentType;
    onSave: (
      longName: string,
      name: string,
      description: string,
      templateID: string,
      icon: string,
    ) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypesForm extends Component<AdminDoctypesFormSignature> {
  @service declare documentTypes: DocumentTypesService;

  @tracked protected longName = this.args.doctype?.longName || "";
  @tracked protected longNameErrorIsShown = false;
  @tracked protected nameErrorText = "";

  @tracked protected name = this.args.doctype?.name || "";
  @tracked protected nameErrorIsShown = false;
  @tracked protected abbreviationErrorText = "";

  @tracked protected description = this.args.doctype?.description || "";
  // We don't have this info from the backend yet
  @tracked protected templateID = "";
  @tracked protected icon = "";

  @tracked protected customFieldModalIsShown = false;
  @tracked protected checkModalIsShown = false;
  @tracked protected moreInfoLinkModalIsShown = false;

  protected get suggestedFields() {
    return [
      {
        name: "Title",
        type: "string",
        icon: "align-left",
        isRequired: true,
      },
      {
        name: "Summary",
        type: "long-string",
        icon: "align-left",
        isRequired: true,
      },
      {
        name: "Product/Area",
        type: "product-area",
        icon: "folder",
        isRequired: true,
      },
      {
        name: "Approvers",
        type: "people",
        icon: "users",
        // TODO
        specialPermissions: "approve",
      },
      {
        name: "Contributors",
        type: "people",
        icon: "users",

        specialPermissions: "contribute",
      },
      {
        name: "Stakeholders",
        type: "people",
        icon: "users",
      },
      {
        name: "Related resources",
        type: "related-resources",
        icon: "paperclip",
      },
      {
        name: "Current version",
        type: "string",
        icon: "type",
      },
      {
        name: "Target version",
        type: "string",
        icon: "type",
      },
    ];
  }

  @action protected showCustomFieldModal() {
    this.customFieldModalIsShown = true;
  }

  @action protected hideCustomFieldModal() {
    this.customFieldModalIsShown = false;
  }

  @action protected showCheckModal() {
    this.checkModalIsShown = true;
  }

  @action protected hideCheckModal() {
    this.checkModalIsShown = false;
  }

  @action protected showMoreInfoLinkModal() {
    this.moreInfoLinkModalIsShown = true;
  }

  @action protected hideMoreInfoLinkModal() {
    this.moreInfoLinkModalIsShown = false;
  }

  /**
   *
   */
  @action protected setLongName(event: Event): void {
    this.longName = (event.target as HTMLInputElement).value;
    this.validateName();
  }

  private validateName(): void {
    const lowercaseNames = this.documentTypes.longNames.map((name) =>
      name.toLowerCase(),
    );

    if (lowercaseNames.includes(this.longName.toLowerCase())) {
      this.longNameErrorIsShown = true;
    } else {
      this.longNameErrorIsShown = false;
    }
  }

  /**
   *
   */
  @action protected setName(event: Event): void {
    this.name = (event.target as HTMLInputElement).value;
    this.validateAbbreviation();
  }

  /**
   *
   */
  protected validateAbbreviation(): void {
    const lowercaseAbbreviations = this.documentTypes.names.map((name) =>
      name.toLowerCase(),
    );
    if (lowercaseAbbreviations.includes(this.name.toLowerCase())) {
      this.nameErrorIsShown = true;
    } else {
      this.nameErrorIsShown = false;
    }
  }

  /**
   *
   */
  @action protected setDescription(event: Event): void {
    this.description = (event.target as HTMLInputElement).value;
    // char count? required?
  }

  /**
   *
   */
  @action protected setTemplateID(event: Event): void {
    this.templateID = (event.target as HTMLInputElement).value;
    // Probably don't need to check for duplicates but
    // We may want to ensure it's the right format
  }

  /**
   *
   */
  @action protected submit(e: SubmitEvent): void {
    e.preventDefault();
    // TODO: Validate
    this.args.onSave(
      this.longName,
      this.name,
      this.description,
      this.templateID,
      this.icon,
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::Doctypes::Form": typeof AdminDoctypesForm;
  }
}
