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

  get suggestedFields() {
    return [
      {
        name: "Product/Area",
        type: "product-area",
        isRequired: true,
      },
      {
        name: "Title",
        type: "string",
        isRequired: true,
      },
      {
        name: "Summary",
        type: "long-string",
        isRequired: true,
      },
      {
        name: "Approvers",
        type: "people",
        specialPermissions: "approve",
      },
      {
        name: "Contributors",
        type: "people",
        specialPermissions: "contribute",
      },
      {
        name: "Stakeholders",
        type: "people",
      },
      {
        name: "Current version",
        type: "string",
      },
      {
        name: "Target version",
        type: "string",
      },
    ];
  }

  get customFieldTypes() {
    return {
      string: {
        name: "Text",
      },
      "long-string": {
        name: "Long text",
      },
      people: {
        name: "People",
      },
    };
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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::DocTypes": typeof AdminDocTypes;
  }
}
