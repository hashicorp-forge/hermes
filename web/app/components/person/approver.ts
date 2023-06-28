import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface PersonApproverComponentSignature {
  Element: HTMLDivElement;
  Args: {
    document: HermesDocument;
    email: string;
    imgURL?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class PersonApproverComponent extends Component<PersonApproverComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Approver": typeof PersonApproverComponent;
  }
}
