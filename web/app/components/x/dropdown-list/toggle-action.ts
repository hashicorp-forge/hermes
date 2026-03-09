import Component from "@glimmer/component";
import type { XDropdownListToggleComponentArgs } from "./_shared";

interface XDropdownListToggleActionComponentSignature {
  Element: HTMLButtonElement;
  Args: XDropdownListToggleComponentArgs & {
    hasChevron?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListToggleActionComponent extends Component<XDropdownListToggleActionComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/toggle-action": typeof XDropdownListToggleActionComponent;
  }
}
