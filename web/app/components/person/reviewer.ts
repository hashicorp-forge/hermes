import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface PersonReviewerComponentSignature {
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

export default class PersonReviewerComponent extends Component<PersonReviewerComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Person::Reviewer": typeof PersonReviewerComponent;
  }
}
