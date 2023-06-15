import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";

interface InputsBadgeDropdownListComponentSignature {
  Element: HTMLDivElement;
  Args: {
    items: any;
    selected?: any;
    listIsOrdered?: boolean;
    isSaving?: boolean;
    onItemClick: ((e: Event) => void) | ((e: string) => void);
    placement?: Placement;
    icon: string;
    renderOut?: boolean;
  };
  Blocks: {
    default: [];
    item: [dd: any];
  };
}

export default class InputsBadgeDropdownListComponent extends Component<InputsBadgeDropdownListComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::BadgeDropdownList": typeof InputsBadgeDropdownListComponent;
  }
}
