import Component from "@glimmer/component";

interface InputsProductSelectItemComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    isSelected?: boolean;
    abbreviation?: boolean;
  };
}

export default class InputsProductSelectItemComponent extends Component<InputsProductSelectItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::ProductSelect::Item": typeof InputsProductSelectItemComponent;
  }
}
