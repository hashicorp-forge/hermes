import Component from "@glimmer/component";

interface PersonComponentSignature {
  Element: HTMLDivElement;
  Args: {
    email: string;
    imgURL?: string;
    ignoreUnknown?: boolean;
    badge?: string;
  };
}

export default class PersonComponent extends Component<PersonComponentSignature> {
  get isHidden() {
    return this.args.ignoreUnknown && !this.args.email;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Person: typeof PersonComponent;
  }
}
