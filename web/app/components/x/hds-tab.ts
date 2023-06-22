import Component from "@glimmer/component";

interface XHdsTabComponentSignature {
  Args: {
    label: string;
    icon: string;
    isSelected: boolean;
    action: () => void;
  };
  Blocks: {
    default: [];
  };
}

export default class XHdsTabComponent extends Component<XHdsTabComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::HdsTab": typeof XHdsTabComponent;
  }
}
