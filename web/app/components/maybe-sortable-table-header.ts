import Component from "@glimmer/component";
import { action } from "@ember/object";
import { SortAttribute, SortDirection } from "./my-docs";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface MaybeSortableTableHeaderComponentSignature {
  Element: HTMLButtonElement;
  Args: {
    sortAttribute: `${SortAttribute}`;
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

export default class MaybeSortableTableHeaderComponent extends Component<MaybeSortableTableHeaderComponentSignature> {
  @service declare router: RouterService;

  protected get currentRoute() {
    return this.router.currentRouteName;
  }

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

  protected get isReadOnly() {
    // CreatedTime is always interactive
    if (this.args.attribute === SortAttribute.CreatedTime) {
      return false;
    }

    // Unless we're on the /my route, all other headers are read-only
    return !this.router.currentRouteName.startsWith("authenticated.my");
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
    MaybeSortableTableHeader: typeof MaybeSortableTableHeaderComponent;
  }
}
