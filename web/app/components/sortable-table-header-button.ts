import Component from "@glimmer/component";
import { action } from "@ember/object";
import { SortAttribute, SortDirection } from "./my-docs";
import { assert } from "@ember/debug";

interface SortableTableHeaderButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    sortAttribute: SortAttribute;
    sortDirection: SortDirection;
    attribute: `${SortAttribute}`;
    changeSort?: (
      attribute: SortAttribute,
      defaultSortDirection?: SortDirection
    ) => void;
    disabled?: boolean;
    defaultSortDirection?: `${SortDirection}`;
  };
  Blocks: {
    default: [];
  };
}

export default class SortableTableHeaderButtonComponent extends Component<SortableTableHeaderButtonComponentSignature> {
  protected get iconName() {
    if (this.args.sortAttribute === this.args.attribute) {
      if (this.args.sortDirection === SortDirection.Asc) {
        return "arrow-up";
      } else {
        return "arrow-down";
      }
    } else {
      return "swap-vertical";
    }
  }

  private get sortDirection() {
    if (!this.isActive) {
      return (
        (this.args.defaultSortDirection as SortDirection) ?? SortDirection.Asc
      );
    }
  }

  protected get isActive() {
    return this.args.sortAttribute === this.args.attribute;
  }

  @action protected changeSort() {
    assert("this.args.changeSort must exists", this.args.changeSort);
    this.args.changeSort(
      this.args.attribute as SortAttribute,
      this.sortDirection
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    SortableTableHeaderButton: typeof SortableTableHeaderButtonComponent;
  }
}
