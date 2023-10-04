import Component from "@glimmer/component";
import { HermesDocument, HermesUser } from "hermes/types/document";

interface EditableFieldReadValueSignature {
  Args: {
    tag?: "h1";
    value: string | HermesUser[];
    type?: "people" | "approvers";
    document?: HermesDocument;
  };
  Blocks: {
    default: [];
  };
}

export default class EditableFieldReadValue extends Component<EditableFieldReadValueSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    'EditableField::ReadValue': typeof EditableFieldReadValue;
  }
}
