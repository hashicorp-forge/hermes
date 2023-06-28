import Component from "@glimmer/component";
import { HdsButtonColor } from "hds/_shared";
import { XDropdownListToggleComponentArgs } from "./_shared";

interface XDropdownListToggleButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: XDropdownListToggleComponentArgs & {
    color: HdsButtonColor;
    text: string;
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListToggleButtonComponent extends Component<XDropdownListToggleButtonComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/toggle-button": typeof XDropdownListToggleButtonComponent;
  }
}
