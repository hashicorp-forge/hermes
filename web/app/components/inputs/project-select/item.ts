import Component from "@glimmer/component";
import InputsProjectSelectComponent from "hermes/components/inputs/project-select/index";

interface InputsProjectSelectItemComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    selected: boolean;
    abbreviation?: boolean;
  };
}

export default class InputsProjectSelectItemComponent extends Component<InputsProjectSelectItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::ProjectSelect::Item": typeof InputsProjectSelectComponent;
  }
}
