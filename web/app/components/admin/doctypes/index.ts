import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import DocumentTypesService from "hermes/services/document-types";
import { HermesDocumentType } from "hermes/types/document-type";

interface AdminDoctypesSignature {
  Element: null;
  Args: {
    docTypes: HermesDocumentType[];
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypes extends Component<AdminDoctypesSignature> {
  @service declare documentTypes: DocumentTypesService;

  @tracked protected longName = "";
  @tracked protected longNameErrorIsShown = false;
  @tracked protected nameErrorText = "";

  @tracked protected name = "";
  @tracked protected nameErrorIsShown = false;
  @tracked protected abbreviationErrorText = "";

  @tracked protected description = "";
  @tracked protected templateID = "";
  @tracked protected icon = "";

  @tracked modalIsShown = false;
  @tracked customFieldHasTooltip = false;
  @tracked selectedCustomFieldType = "string";

  get suggestedFields() {
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

  get customFieldTypes() {
    return {
      string: {
        name: "Short text",
        icon: "type",
      },
      "long-string": {
        name: "Long text",
        icon: "align-left",
      },
      people: {
        name: "People",
        icon: "users",
      },
      document: {
        name: "Hermes Doc",
        icon: "file-text",
      },
    };
  }

  get selectedCustomFieldIcon() {
    switch (this.selectedCustomFieldType) {
      case "long-string":
        return "align-left";
      case "string":
        return "type";
      case "people":
        return "users";
      case "document":
        return "file-text";
    }
  }

  get selectedCustomFieldLabel() {
    switch (this.selectedCustomFieldType) {
      case "long-string":
        return "Long text";
      case "string":
        return "Short text";
      case "people":
        return "People";
      case "document":
        return "Hermes Doc";
    }
  }

  @action showModal() {
    this.modalIsShown = true;
  }

  @action hideModal() {
    this.modalIsShown = false;
  }

  @action addField() {
    return;
  }

  @action toggleHasTooltip() {
    this.customFieldHasTooltip = !this.customFieldHasTooltip;
  }

  @action setCustomFieldType(type: string) {
    this.selectedCustomFieldType = type;
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
    // TODO
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::Doctypes": typeof AdminDoctypes;
  }
}
