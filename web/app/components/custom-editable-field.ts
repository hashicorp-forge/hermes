import Component from "@glimmer/component";
import { CustomEditableField, HermesDocument } from "hermes/types/document";

interface CustomEditableFieldComponentSignature {
  Args: {
    document: HermesDocument;
    field: string;
    attributes: CustomEditableField;
    onChange: (value: any) => void;
    isSaving?: boolean;
    disabled?: boolean;
  };
}

export default class CustomEditableFieldComponent extends Component<CustomEditableFieldComponentSignature> {
  protected get typeIsString(): boolean {
    return this.args.attributes.type === "STRING";
  }

  protected get typeIsPeople(): boolean {
    return this.args.attributes.type === "PEOPLE";
  }

  protected get emails(): string[] {
    if (this.args.attributes.value instanceof Array) {
      return this.args.attributes.value;
    }
    if (this.args.attributes.value) {
      return [this.args.attributes.value];
    } else {
      return [];
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CustomEditableField: typeof CustomEditableFieldComponent;
  }
}
