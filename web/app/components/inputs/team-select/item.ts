import Component from "@glimmer/component";
import InputsTeamSelectComponent from "hermes/components/inputs/team-select/index";

interface InputsTeamSelectItemComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    selected: boolean;
    abbreviation?: boolean;
  };
}

export default class InputsTeamSelectItemComponent extends Component<InputsTeamSelectItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::TeamSelect::Item": typeof InputsTeamSelectComponent;
  }
}
