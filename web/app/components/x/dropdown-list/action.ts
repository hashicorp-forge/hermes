import Component from "@glimmer/component";

export type XDropdownListActionComponentArgs = {
  registerElement: (e: HTMLElement) => void;
  focusMouseTarget: (e: MouseEvent) => void;
  onClick: () => void;
  disabled?: boolean;
  role: string;
  isAriaSelected: boolean;
  isAriaChecked: boolean;
};

interface XDropdownListActionComponentSignature {
  Element: HTMLButtonElement;
  Args: XDropdownListActionComponentArgs;
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
