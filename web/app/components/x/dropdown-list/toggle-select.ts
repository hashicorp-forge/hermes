import Component from "@glimmer/component";
import type { XDropdownListToggleComponentArgs } from "./_shared";

interface XDropdownListToggleSelectComponentSignature {
  Element: HTMLButtonElement;
  Args: XDropdownListToggleComponentArgs;
  Blocks: {
    default: [];
  };
}

export default class XDropdownListToggleSelectComponent extends Component<XDropdownListToggleSelectComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/toggle-select": typeof XDropdownListToggleSelectComponent;
  }
}
