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
  /**
   * Whether the field is a string or a PeopleSelect.
   * Used in the template to determine which values and functions to pass.
   */
  protected typeIsString = this.args.attributes.type === "STRING";
  protected typeIsPeople = this.args.attributes.type === "PEOPLE";

  /**
   * The cached value of the field.
   * Starts as the value passed in; updated on save.
   * Used to revert `emails` when the users hits Escape.
   */
  @tracked private cachedEmails = this.args.attributes.value || [];

  /**
   * The value of the field. Initially set to the value passed in.
   * Changes when the user updates or saves the PeopleSelect value.
   */
  @tracked protected emails = this.cachedEmails;

  /**
   * The value of the field, serialized for the PeopleSelect.
   */
  protected get hermesUsers(): HermesUser[] {
    let emails = this.emails instanceof Array ? this.emails : [this.emails];
    return emails.map((email: string) => {
      return { email, imgURL: null };
    });
  }

  /**
   * The function to call when the user updates the PeopleSelect value.
   * Deserializes the value and updates the local `emails` property.
   */
  @action protected onPeopleSelectChange(people: HermesUser[]) {
    this.emails = people.map((person: HermesUser) => {
      return person.email;
    });
  }

  /**
   * The function to call when the user saves PeopleSelect changes.
   * Calls the parent `onSave` action and updates the local `cached` property.
   */
  @action protected onPeopleSave() {
    this.args.onSave(this.emails);
    this.cachedEmails = this.emails;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CustomEditableField: typeof CustomEditableFieldComponent;
  }
}
