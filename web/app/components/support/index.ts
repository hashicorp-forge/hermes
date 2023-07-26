import Component from "@glimmer/component";

interface SupportComponentSignature {
  Args: {
    docs: any;
  };
}

export default class SupportComponent extends Component<SupportComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Support: typeof SupportComponent;
  }
}
