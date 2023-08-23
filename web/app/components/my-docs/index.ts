import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { sort } from "@ember/object/computed";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";

interface MyDocsIndexComponentSignature {
  Element: null;
  Args: {
    allDocs: HermesDocument[];
    inReviewDocs: HermesDocument[];
    approvedDocs: HermesDocument[];
    drafts: HermesDocument[];
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
  ModifiedTime = "modifiedTime", // currently unused
  Owner = "owners",
  Product = "product",
  Status = "status",
  DocType = "docType",
  Name = "title",
}

export default class MyDocsIndexComponent extends Component<MyDocsIndexComponentSignature> {
  @service declare router: RouterService;
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked sortAttribute = SortAttribute.CreatedTime;
  @tracked sortDirection = SortDirection.Desc;

  @tracked isCollapsed = true;

  get currentRoute() {
    return this.router.currentRouteName;
  }

  get docsToShow() {
    switch (this.currentRoute) {
      case "authenticated.my.drafts":
        return this.args.drafts;
      case "authenticated.my.index":
        return this.args.allDocs;
      case "authenticated.my.approved":
        return this.args.approvedDocs;
      case "authenticated.my.in-review":
        return this.args.inReviewDocs;
    }
  }

  protected get sortedDocs() {
    assert("docsToShow must exist", this.docsToShow);
    // this only applies to the /my routes
    if (this.router.currentRouteName.startsWith("authenticated.my")) {
      return this.docsToShow.slice().sort((a, b) => {
        const aProp = a[this.sortAttribute];
        const bProp = b[this.sortAttribute];

        if (aProp === undefined || bProp === undefined) {
          return 0;
        }

        if (this.sortDirection === SortDirection.Asc) {
          // if the attribute is a number, sort by number
          // otherwise, sort by string or the first item in the array

          if (typeof a[this.sortAttribute] === "number") {
            // @ts-ignore
            return a[this.sortAttribute] - b[this.sortAttribute];
          }

          if (typeof a[this.sortAttribute] === "string") {
            // @ts-ignore
            return a[this.sortAttribute].localeCompare(b[this.sortAttribute]);
          }

          if (Array.isArray(a[this.sortAttribute])) {
            // @ts-ignore
            return a[this.sortAttribute][0].localeCompare(
              // @ts-ignore
              b[this.sortAttribute][0]
            );
          }
        } else {
          if (typeof a[this.sortAttribute] === "number") {
            // @ts-ignore
            return b[this.sortAttribute] - a[this.sortAttribute];
          }

          if (typeof a[this.sortAttribute] === "string") {
            // @ts-ignore
            return b[this.sortAttribute].localeCompare(a[this.sortAttribute]);
          }

          if (Array.isArray(a[this.sortAttribute])) {
            // @ts-ignore
            return b[this.sortAttribute][0].localeCompare(
              // @ts-ignore
              a[this.sortAttribute][0]
            );
          }
        }
      });
    }
    return this.docsToShow;
  }

  @action protected changeSort(
    attribute: SortAttribute,
    sortDirection?: SortDirection
  ) {
    if (this.sortAttribute === attribute) {
      if (this.sortDirection === SortDirection.Asc) {
        this.sortDirection = SortDirection.Desc;
      } else {
        this.sortDirection = SortDirection.Asc;
      }
    } else {
      this.sortAttribute = attribute;
      this.sortDirection = sortDirection ?? SortDirection.Asc;
    }
  }

  @action protected toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }

  @action resetLocalProperties() {
    this.sortAttribute = SortAttribute.CreatedTime;
    this.sortDirection = SortDirection.Desc;
    this.isCollapsed = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    MyDocs: typeof MyDocsIndexComponent;
  }
}
