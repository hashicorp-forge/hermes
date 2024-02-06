import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import Person from "hermes/components/person";

interface EditableFieldReadValuePersonSignature {
  Args: {
    email: string;
    document?: HermesDocument;
  };
}

export default class EditableFieldReadValuePerson extends Component<EditableFieldReadValuePersonSignature> {
  /**
   * Whether the document has been approved by the user.
   * True if the email is in the approvedBy list.
   * Dictates the badge on the Person component.
   */
  protected get hasApprovedDoc(): boolean {
    const { document, email } = this.args;

    if (document?.approvedBy) {
      return document.approvedBy.some((e) => e === email);
    } else {
      return false;
    }
  }

  /**
   * Whether the document has been rejected by the user.
   * True if the email is in the changesRequestedBy list.
   * Dictates the badge on the Person component.
   */
  protected get hasRejectedDoc(): boolean {
    const { document, email } = this.args;

    if (document?.changesRequestedBy) {
      return document.changesRequestedBy.some((e) => e === email);
    } else {
      return false;
    }
  }

  /**
   * The conditional badge value to pass to the Person component.
   * Return badges for "approved" and "rejected" scenarios.
   */
  protected get maybeBadgeValue(): string | undefined {
    if (this.hasApprovedDoc) return "approved";
    if (this.hasRejectedDoc) return "rejected";
  }

  <template>
    <Person @badge={{this.maybeBadgeValue}} @email={{@email}} />
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "EditableField::ReadValue::Person": typeof EditableFieldReadValuePerson;
  }
}
