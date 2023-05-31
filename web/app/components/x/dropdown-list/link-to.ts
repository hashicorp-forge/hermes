import Component from "@glimmer/component";

interface XDropdownListLinkToComponentSignature {
  Element: HTMLAnchorElement;
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
    query?: Record<string, unknown>;
    model?: unknown;
    models?: unknown[];
  };
  Blocks: {
    default: [];
  };
}

export default class XDropdownListLinkToComponent extends Component<XDropdownListLinkToComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "x/dropdown-list/link-to": typeof XDropdownListLinkToComponent;
  }
}
