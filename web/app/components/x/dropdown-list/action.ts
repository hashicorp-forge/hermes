import Component from "@glimmer/component";
import type { XDropdownListInteractiveComponentArgs } from "./_shared";

interface XDropdownListActionComponentSignature {
  Element: HTMLButtonElement;
  Args: XDropdownListInteractiveComponentArgs;
  Blocks: {
    default: [];
  };
}

export default class XDropdownListActionComponent extends Component<XDropdownListActionComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/action": typeof XDropdownListActionComponent;
  }
}
