import { assert } from "@ember/debug";
import Component from "@glimmer/component";
import type { HermesDocument } from "hermes/types/document";

interface EditableFieldReadValueSignature {
  Args: {
    tag?: "h1";
    value?: string | string[];
    placeholder?: string;
    document?: HermesDocument; // Used to check an approver's approval status
  };
  Blocks: {
    default: [];
  };
}

export default class EditableFieldReadValue extends Component<EditableFieldReadValueSignature> {
  protected get typeIsPeople(): boolean {
    return this.args.value instanceof Array;
  }

  protected get valueIsEmpty(): boolean {
    if (!this.args.value) {
      return true;
    }
    if (typeof this.args.value === "string") {
      return this.args.value === "";
    } else {
      return this.emails.length === 0;
    }
  }

  protected get stringValue(): string {
    assert("value must be a string", typeof this.args.value === "string");
    return this.args.value;
  }

  protected get document(): HermesDocument {
    assert("document must exist", this.args.document);
    return this.args.document;
  }

  protected get emails(): string[] {
    assert("value must be an array", Array.isArray(this.args.value));
    return this.args.value;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "EditableField::ReadValue": typeof EditableFieldReadValue;
  }
}
