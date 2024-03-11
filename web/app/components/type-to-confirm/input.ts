import Component from "@glimmer/component";

interface TypeToConfirmInputSignature {
  Args: {
    onInput: (event: Event) => void;
    onKeydown: (event: KeyboardEvent) => void;
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
