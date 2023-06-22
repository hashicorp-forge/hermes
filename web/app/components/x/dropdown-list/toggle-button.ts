import Component from "@glimmer/component";
import { HdsButtonColor } from "hds/_shared";

interface XDropdownListToggleButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    registerAnchor: (element: HTMLElement) => void;
    onTriggerKeydown: (event: KeyboardEvent) => void;
    toggleContent: () => void;
    contentIsShown: boolean;
    disabled?: boolean;
    ariaControls: string;
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
