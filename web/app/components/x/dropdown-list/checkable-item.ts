import Component from "@glimmer/component";

interface XDropdownListCheckableItemComponentSignature {
  Args: {
    isSelected?: boolean;
    value: string;
    count?: number;
  };
}

export default class XDropdownListCheckableItemComponent extends Component<XDropdownListCheckableItemComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList::CheckableItem": typeof XDropdownListCheckableItemComponent;
  }
}
