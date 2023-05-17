import Component from "@glimmer/component";

interface InputsBadgeDropdownListComponentSignature {
  Args: {
    items: any;
    selected?: any;
    listIsOrdered?: boolean;
    isSaving?: boolean;
    onItemClick: () => void;
  };
}

export default class InputsBadgeDropdownListComponent extends Component<InputsBadgeDropdownListComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::BadgeDropdownList": typeof InputsBadgeDropdownListComponent;
  }
}
