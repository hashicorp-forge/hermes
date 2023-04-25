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
}

export default class XDropdownListActionComponent extends Component<XDropdownListActionComponentSignature> {}
