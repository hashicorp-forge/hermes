import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { XDropdownListItemAPI } from "../x/dropdown-list/item";
import { XDropdownListSharedArgs } from "../x/dropdown-list/_shared";

interface InputsBadgeDropdownListComponentSignature {
  Element: HTMLDivElement;
  Args: XDropdownListSharedArgs & {
    isSaving?: boolean;
    isLoading?: boolean;
    placement?: Placement;
    renderOut?: boolean;

    onItemClick: ((e: Event) => void) | ((e: string) => void);
    icon: string;
  };
  Blocks: {
    default: [];
    item: [dd: XDropdownListItemAPI];
  };
}

export default class InputsBadgeDropdownListComponent extends Component<InputsBadgeDropdownListComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::BadgeDropdownList": typeof InputsBadgeDropdownListComponent;
  }
}
