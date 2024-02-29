import Component from "@glimmer/component";

interface HeaderComponentSignature {
  Args: {
    query?: string;
  };
}

export default class HeaderComponent extends Component<HeaderComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Header: typeof HeaderComponent;
  }
}
