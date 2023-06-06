import Component from "@glimmer/component";

interface XDropdownListActionComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    registerElement: () => void;
    focusMouseTarget: () => void;
    onClick: () => void;
    disabled?: boolean;
    ariaControls: string;
    role: string;
    isAriaSelected: boolean;
    isAriaChecked: boolean;
  };
  Blocks: {
    default: [];
  }
}

export default class XDropdownListActionComponent extends Component<XDropdownListActionComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    'x/dropdown-list/action': typeof XDropdownListActionComponent;
  }
}
