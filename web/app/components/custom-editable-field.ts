import { action, get } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { CustomEditableField, HermesDocument } from "hermes/types/document";

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
   * Whether type of the field is `PEOPLE`.
   * Used in the template to determine what to pass to `EditableField`.
   */
  protected get typeIsPeople() {
    return this.args.attributes.type === "PEOPLE";
  }

  /**
   * The value of the field. Initially set to the value passed in.
   * Changes when the user updates or saves the PeopleSelect value.
   */
  @tracked protected emails = this.args.attributes.value || [];

  protected get stringValue(): string {
    const value = get(this.args.document, this.args.field);
    if (typeof value === "string") {
      return value;
    } else {
      return "";
    }
  }

  /**
   * The function to call when the user updates the PeopleSelect value.
   * Saves the new value to the local `emails` property.
   */
  @action protected onPeopleSelectChange(emails: string[]) {
    this.emails = emails;
  }

  /**
   * The function to call when the user saves PeopleSelect changes.
   * Calls the parent `onSave` action and updates the local `cached` property.
   */
  @action protected onPeopleSave() {
    this.args.onSave(this.emails);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    CustomEditableField: typeof CustomEditableFieldComponent;
  }
}
