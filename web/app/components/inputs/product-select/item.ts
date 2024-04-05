import Component from "@glimmer/component";

interface InputsProductSelectItemComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product?: string;
    isSelected?: boolean;
    abbreviation?: string;
  };
}

export default class InputsProductSelectItemComponent extends Component<InputsProductSelectItemComponentSignature> {
  protected get abbreviationIsShown(): boolean {
    const { abbreviation, product } = this.args;
    if (abbreviation && abbreviation !== product) {
      return true;
    }
    return false;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::ProductSelect::Item": typeof InputsProductSelectItemComponent;
  }
}
