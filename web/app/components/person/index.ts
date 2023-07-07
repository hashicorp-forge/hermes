import Component from "@glimmer/component";

interface PersonComponentSignature {
  Element: HTMLDivElement;
  Args: {
    email?: string;
    imgURL?: string | null;
    ignoreUnknown?: boolean;
    badge?: string;
    onlyShowAvatar?: boolean;
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
