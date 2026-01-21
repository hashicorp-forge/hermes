import Component from "@glimmer/component";
import { service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}

export enum SortAttribute {
  CreatedTime = "createdTime",
  ModifiedTime = "modifiedTime",
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
    sortDirection: `${SortDirection}`;
    attribute: `${SortAttribute}`;
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

  protected get isActive() {
    return this.args.currentSort === this.args.attribute;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Table::SortableHeader": typeof TableSortableHeader;
  }
}
