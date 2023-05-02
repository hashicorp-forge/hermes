import Component from "@glimmer/component";

interface XDropdownListLinkToComponentSignature {
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
    route: string;
    query?: unknown;
  };
}

export default class XDropdownListLinkToComponent extends Component<XDropdownListLinkToComponentSignature> {}
