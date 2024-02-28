import Component from "@glimmer/component";

export enum CheckmarkPosition {
  Leading = "leading",
  Trailing = "trailing",
}

export interface XDropdownListCheckableItemComponentArgs {
  value?: string;
  isSelected?: boolean;
  count?: number;
  checkmarkPosition?: `${CheckmarkPosition}`;
}

interface XDropdownListCheckableItemComponentSignature {
  Element: HTMLDivElement;
  Args: XDropdownListCheckableItemComponentArgs;
  Blocks: {
    default: [];
  };
}

export default class XDropdownListCheckableItemComponent extends Component<XDropdownListCheckableItemComponentSignature> {
  /**
   * Whether the item has a count to display.
   * True if the count is defined, including if it's 0.
   */
  protected get countIsShown(): boolean {
    return this.args.count !== undefined;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList::CheckableItem": typeof XDropdownListCheckableItemComponent;
  }
}
