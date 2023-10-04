import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import {
  CustomEditableField,
  HermesDocument,
  HermesUser,
} from "hermes/types/document";

interface CustomEditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    document: HermesDocument;
    field: string;
    attributes: CustomEditableField;
    onCommit: (value: any) => void;
    isSaving?: boolean;
    disabled?: boolean;
  };
}

export default class CustomEditableFieldComponent extends Component<CustomEditableFieldComponentSignature> {
  @tracked protected emails: string | string[] =
    this.args.attributes.value || [];

  protected get typeIsString(): boolean {
    return this.args.attributes.type === "STRING";
  }

  protected get typeIsPeople(): boolean {
    return this.args.attributes.type === "PEOPLE";
  }

  protected get people(): HermesUser[] {
    let emails = this.emails instanceof Array ? this.emails : [this.emails];
    return emails.map((email: string) => {
      return { email, imgURL: null };
    });
  }
  @action protected updateEmails(people: HermesUser[]) {
    this.emails = people.map((person: HermesUser) => {
      return person.email;
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CustomEditableField: typeof CustomEditableFieldComponent;
  }
}
