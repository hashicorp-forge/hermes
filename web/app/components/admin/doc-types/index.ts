import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocumentType } from "hermes/types/document-type";

interface AdminDocTypesSignature {
  Element: null;
  Args: {
    docTypes: HermesDocumentType[];
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDocTypes extends Component<AdminDocTypesSignature> {
  @tracked modalIsShown = false;

  @tracked customFieldHasTooltip = false;

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

  @tracked selectedCustomFieldType = "string";

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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::DocTypes": typeof AdminDocTypes;
  }
}
