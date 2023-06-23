import Component from "@glimmer/component";

export interface XDropdownListCheckableItemComponentArgs {
  value: string;
  isSelected?: boolean;
  count?: number;
}

interface XDropdownListCheckableItemComponentSignature {
  Args: XDropdownListCheckableItemComponentArgs;
}

export default class XDropdownListCheckableItemComponent extends Component<XDropdownListCheckableItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList::CheckableItem": typeof XDropdownListCheckableItemComponent;
  }
}
