import Component from "@glimmer/component";
import { action } from "@ember/object";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}

export enum SortAttribute {
  CreatedTime = "createdTime",
  Owner = "owners",
  Product = "product",
  Status = "status",
  DocType = "docType",
  Name = "title",
}

interface TableSortableHeaderSignature {
  Element: HTMLButtonElement | HTMLAnchorElement;
  Args: {
    currentSort: `${SortAttribute}`;
    sortDirection: SortDirection;
    attribute: `${SortAttribute}`;
    changeSort?: (
      attribute: SortAttribute,
      defaultSortDirection?: SortDirection
    ) => void;
    defaultSortDirection?: `${SortDirection}`;
    queryParam?: Record<string, unknown>;
  };
  Blocks: {
    default: [];
  };
}

export default class TableSortableHeader extends Component<TableSortableHeaderSignature> {
  @service declare router: RouterService;

  protected get currentRoute() {
    return this.router.currentRouteName;
  }

  protected get iconName() {
    if (this.args.currentSort === this.args.attribute) {
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

  protected get isReadOnly() {
    if (this.args.attribute === SortAttribute.CreatedTime) {
      return false;
    }

    return true;
  }

  protected get isActive() {
    return this.args.currentSort === this.args.attribute;
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
    "Table::SortableHeader": typeof TableSortableHeader;
  }
}
