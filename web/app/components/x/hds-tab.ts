import Component from "@glimmer/component";

interface XHdsTabComponentSignature {
  Args: {
    action?: () => void;
    isSelected?: boolean;
    icon: string;
    iconOnly?: boolean;
    label: string;
    link?: string;
    query?: string;
  };
}

export default class XHdsTabComponent extends Component<XHdsTabComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::HdsTab": typeof XHdsTabComponent;
  }
}
