import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import Person from "hermes/components/person";
interface EditableFieldReadValuePersonSignature {
  Element: null;
  Args: {
    email: string;
    document?: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class EditableFieldReadValuePerson extends Component<EditableFieldReadValuePersonSignature> {
  protected get hasApprovedDoc(): boolean {
    const { document, email } = this.args;

    if (document?.approvedBy) {
      return document.approvedBy.some((e) => e === email);
    } else {
      return false;
    }
  }

  protected get hasRejectedDoc(): boolean {
    const { document, email } = this.args;

    if (document?.changesRequestedBy) {
      return document.changesRequestedBy.some((e) => e === email);
    } else {
      return false;
    }
  }

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
