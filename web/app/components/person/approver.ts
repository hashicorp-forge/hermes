import Component from "@glimmer/component";

interface PersonApproverComponentSignature {
  Element: HTMLDivElement;
  Args: {
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
