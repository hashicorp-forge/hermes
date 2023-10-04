import { assert } from "@ember/debug";
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
    onSave: (value: any) => void;
    isSaving?: boolean;
    disabled?: boolean;
  };
}

export default class CustomEditableFieldComponent extends Component<CustomEditableFieldComponentSignature> {
  @tracked private cached = this.args.attributes.value || [];
  @tracked protected emails = this.cached;

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

  @action protected onPeopleSelectKeydown(
    update: (value: any) => void,
    dropdown: any,
    event: KeyboardEvent,
  ) {
    const popoverSelector = ".ember-basic-dropdown-content";

    if (event.key === "Enter") {
      if (!document.querySelector(popoverSelector)) {
        event.preventDefault();
        event.stopPropagation();

        assert("updateFunction must exist", update);
        update(dropdown.selected);
      }
    }

    if (event.key === "Escape") {
      if (document.querySelector(popoverSelector)) {
        event.preventDefault();
        event.stopPropagation();
        dropdown.actions.close();
      } else {
        this.emails = this.cached;
      }
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CustomEditableField: typeof CustomEditableFieldComponent;
  }
}
