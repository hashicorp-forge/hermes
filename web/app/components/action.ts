import Component from "@glimmer/component";

interface ActionComponentSignature {
  Element: HTMLButtonElement;
  Blocks: {
    default: [];
  };
}

export default class ActionComponent extends Component<ActionComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Action: typeof ActionComponent;
  }
}
