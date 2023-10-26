import Component from "@glimmer/component";

export interface XDropdownListCheckableItemComponentArgs {
  value?: string;
  isSelected?: boolean;
  count?: number;
  checkmarkPosition?: "trailing" | "leading";
}

interface XDropdownListCheckableItemComponentSignature {
  Element: HTMLDivElement;
  Args: XDropdownListCheckableItemComponentArgs;
  Blocks: {
    default: [];
  };
}

export default class XDropdownListCheckableItemComponent extends Component<XDropdownListCheckableItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList::CheckableItem": typeof XDropdownListCheckableItemComponent;
  }
}
