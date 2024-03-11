import Component from "@glimmer/component";

interface TypeToConfirmInputSignature {
  Element: HTMLInputElement;
  Args: {
    onInput: (event: Event) => void;
    inputValue: string;
    value: string;
    id: string;
  };
  Blocks: {
    default: [];
  };
}

export default class TypeToConfirmInput extends Component<TypeToConfirmInputSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "type-to-confirm/input": typeof TypeToConfirmInput;
  }
}
