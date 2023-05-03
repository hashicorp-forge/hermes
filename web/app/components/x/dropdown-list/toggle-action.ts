import Component from "@glimmer/component";

interface XDropdownListToggleActionComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    registerAnchor: () => void;
    onTriggerKeydown: () => void;
    toggleContent: () => void;
    disabled?: boolean;
    ariaControls: string;
  };
}

export default class XDropdownListToggleActionComponent extends Component<XDropdownListToggleActionComponentSignature> {}
