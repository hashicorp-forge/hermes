import Component from "@glimmer/component";

interface AskHermesComponentSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AskHermesComponent extends Component<AskHermesComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    AskHermes: typeof AskHermesComponent;
  }
}
