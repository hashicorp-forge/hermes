import Component from "@glimmer/component";

interface ActionComponentSignature {
  Element: HTMLButtonElement;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class ActionComponent extends Component<ActionComponentSignature> {}
