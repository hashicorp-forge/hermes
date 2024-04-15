import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface AdminDoctypesModalCustomFieldComponentSignature {
  Args: {
    onClose: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypesModalCustomFieldComponent extends Component<AdminDoctypesModalCustomFieldComponentSignature> {
  @tracked protected selectedCustomFieldType = "string"; // TODO: enum
  @tracked protected customFieldHasTooltip = false;

  protected get customFieldTypes() {
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

  protected get selectedCustomFieldIcon() {
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

  protected get selectedCustomFieldLabel() {
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

  @action protected setCustomFieldType(type: string) {
    this.selectedCustomFieldType = type;
  }

  @action protected addField() {
    return;
  }

  @action protected toggleHasTooltip() {
    // explain this better, rename
    this.customFieldHasTooltip = !this.customFieldHasTooltip;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::Doctypes::Modal::CustomField": typeof AdminDoctypesModalCustomFieldComponent;
  }
}
