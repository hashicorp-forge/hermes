import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { SortDirection } from "../table/sortable-header";
import { service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import SearchService from "hermes/services/search";
import { SortByValue } from "../header/toolbar";
import RouterService from "@ember/routing/router-service";

interface MyDocsComponentSignature {
  Args: {
    docs: HermesDocument[];
    sortDirection: `${SortDirection}`;
    currentPage: number;
    nbPages: number;
    includeSharedDrafts: boolean;
  };
}

export default class MyDocsComponent extends Component<MyDocsComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare search: SearchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare router: RouterService;

  /**
   * The current route name.
   * Passed to the SortableHeader's `@route` argument.
   */
  protected get currentRoute() {
    return this.router.currentRouteName;
  }

  /**
   * Whether the owner filter is checked.
   * True of the current route's `includeSharedDrafts` query param is false.
   */
  protected get ownerToggleIsChecked() {
    return this.args.includeSharedDrafts;
  }

  /**
   * The params passed to SortableHeader's `@query` argument.
   * Resets the page to 1 and sets the new sort direction.
   */
  protected get ownerFilterQueryParams() {
    if (this.args.includeSharedDrafts) {
      return {
        includeSharedDrafts: false,
        page: 1,
      };
    }
    return {
      includeSharedDrafts: true,
      page: 1,
    };
  }

  /**
   * The params passed to the sort-column LinkTo.
   * Resets the page to 1 and sets the new sort direction.
   */
  protected get sortParams() {
    const sortBy =
      this.args.sortDirection === SortDirection.Asc
        ? SortByValue.DateDesc
        : SortByValue.DateAsc;
    return {
      page: 1,
      sortBy,
    };
  }

  /**
   * Documents grouped by modified date.
   * Looped through by the template to render the documents
   * in human-readable groups.
   */
  protected get docGroups(): { label?: string; docs: HermesDocument[] }[] {
    let docGroupOne: HermesDocument[] = [];
    let docGroupTwo: HermesDocument[] = [];
    let docGroupThree: HermesDocument[] = [];
    let docGroupFour: HermesDocument[] = [];

    const sortIsAsc = this.args.sortDirection === SortDirection.Asc;

    if (sortIsAsc) {
      // Return the whole list in one group
      return [
        {
          label: undefined,
          docs: this.args.docs,
        },
      ];
    } else {
      this.args.docs.filter((doc) => {
        if (doc.modifiedTime) {
          const modifiedTime = new Date(doc.modifiedTime * 1000).getTime();
          const now = Date.now();
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
          const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

          if (modifiedTime > thirtyDaysAgo) {
            docGroupOne.push(doc);
          } else if (modifiedTime > ninetyDaysAgo) {
            docGroupTwo.push(doc);
          } else if (modifiedTime > oneYearAgo) {
            docGroupThree.push(doc);
          } else {
            docGroupFour.push(doc);
          }
        } else {
          docGroupFour.push(doc);
        }
      });

      let groupFourLabel = "More than 1 year old";

      if (!docGroupFour.every((doc) => typeof doc.modifiedTime === "number")) {
        groupFourLabel += " / Unknown";
      }

      return [
        {
          label: "Recently active",
          docs: docGroupOne,
        },
        {
          label: "More than 30 days old",
          docs: docGroupTwo,
        },
        {
          label: "More than 90 days old",
          docs: docGroupThree,
        },
        {
          label: groupFourLabel,
          docs: docGroupFour,
        },
      ];
    }
  }

  /**
   * Whether the pagination component is shown.
   * True if there are more than 1 page of results and the current page defined.
   */
  protected get paginationIsShown() {
    return this.args.nbPages > 1 && this.args.currentPage !== undefined;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Docs": typeof MyDocsComponent;
  }
}
