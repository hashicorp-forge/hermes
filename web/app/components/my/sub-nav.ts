import { assert } from "@ember/debug";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { DraftResponseJSON } from "hermes/routes/authenticated/my";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";

interface MySubNavComponentSignature {
  Element: null;
  Args: {
    latest: HermesDocument[];
    published: HermesDocument[];
    drafts?: DraftResponseJSON;
  };
  Blocks: {
    default: [];
  };
}

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

export default class MySubNavComponent extends Component<MySubNavComponentSignature> {
  @service declare router: RouterService;
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked currentSort = SortAttribute.CreatedTime;
  @tracked sortDirection = SortDirection.Desc;

  @tracked isCollapsed = true;

  get currentRoute() {
    return this.router.currentRouteName;
  }

  // TODO: improve the performance of this?
  get docsToShow() {
    switch (this.currentRoute) {
      case "authenticated.my.drafts":
        return this.args.drafts?.Hits;
      case "authenticated.my.index":
        return this.args.latest;
      case "authenticated.my.published":
        return this.args.published;
    }
  }

  protected get sorted() {
    assert("docsToShow must exist", this.docsToShow);
    // this only applies to the /my routes
    if (this.router.currentRouteName.startsWith("authenticated.my")) {
      return this.docsToShow.slice().sort((a, b) => {
        const aProp = a[this.currentSort];
        const bProp = b[this.currentSort];

        if (aProp === undefined || bProp === undefined) {
          return 0;
        }

        if (this.sortDirection === SortDirection.Asc) {
          // if the attribute is a number, sort by number
          // otherwise, sort by string or the first item in the array

          if (typeof a[this.currentSort] === "number") {
            // @ts-ignore
            return a[this.currentSort] - b[this.currentSort];
          }

          if (typeof a[this.currentSort] === "string") {
            // @ts-ignore
            return a[this.currentSort].localeCompare(b[this.currentSort]);
          }

          if (Array.isArray(a[this.currentSort])) {
            // @ts-ignore
            return a[this.currentSort][0].localeCompare(
              // @ts-ignore
              b[this.currentSort][0],
            );
          }
        } else {
          if (typeof a[this.currentSort] === "number") {
            // @ts-ignore
            return b[this.currentSort] - a[this.currentSort];
          }

          if (typeof a[this.currentSort] === "string") {
            // @ts-ignore
            return b[this.currentSort].localeCompare(a[this.currentSort]);
          }

          if (Array.isArray(a[this.currentSort])) {
            // @ts-ignore
            return b[this.currentSort][0].localeCompare(
              // @ts-ignore
              a[this.currentSort][0],
            );
          }
        }
      });
    }
    return this.docsToShow;
  }

  @action protected changeSort(
    attribute: SortAttribute,
    sortDirection?: SortDirection,
  ) {
    if (this.currentSort === attribute) {
      if (this.sortDirection === SortDirection.Asc) {
        this.sortDirection = SortDirection.Desc;
      } else {
        this.sortDirection = SortDirection.Asc;
      }
    } else {
      this.currentSort = attribute;
      this.sortDirection = sortDirection ?? SortDirection.Asc;
    }
  }

  @action protected toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }

  @action resetLocalProperties() {
    this.currentSort = SortAttribute.CreatedTime;
    this.sortDirection = SortDirection.Desc;
    this.isCollapsed = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::SubNav": typeof MySubNavComponent;
  }
}
