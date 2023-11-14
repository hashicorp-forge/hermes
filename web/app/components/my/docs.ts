import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { SortDirection } from "../table/sortable-header";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { SortByValue } from "../header/toolbar";

interface MyDocsComponentSignature {
  Args: {
    docs: HermesDocument[];
    sortDirection: SortDirection;
    currentPage: number;
    nbPages: number;
    excludeSharedDrafts: boolean;
  };
}

export default class MyDocsComponent extends Component<MyDocsComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected sortDirection = this.args.sortDirection;

  @tracked protected docGroupOne: HermesDocument[] = [];
  @tracked protected docGroupTwo: HermesDocument[] = [];
  @tracked protected docGroupThree: HermesDocument[] = [];
  @tracked protected docGroupFour: HermesDocument[] = [];

  protected get sortParams() {
    const sortBy =
      this.sortDirection === SortDirection.Asc
        ? SortByValue.DateDesc
        : SortByValue.DateAsc;
    return {
      page: 1,
      sortBy,
    };
  }

  protected get docGroups() {
    this.processDocs();

    let groupFourLabel = "More than 1 year old";

    if (
      !this.docGroupFour.every((doc) => typeof doc.modifiedTime === "number")
    ) {
      groupFourLabel += " / Unknown";
    }

    return [
      {
        label: "Recently active",
        docs: this.docGroupOne,
      },
      {
        label: "More than 30 days old",
        docs: this.docGroupTwo,
      },
      {
        label: "More than 90 days old",
        docs: this.docGroupThree,
      },
      {
        label: groupFourLabel,
        docs: this.docGroupFour,
      },
    ];
  }

  protected get paginationIsShown() {
    return this.args.nbPages > 1 && this.args.currentPage !== undefined;
  }

  @action processDocs() {
    this.docGroupOne = [];
    this.docGroupTwo = [];
    this.docGroupThree = [];
    this.docGroupFour = [];

    // FIXME: this needs to be a single index so nbPages are resolved.
    // Currently we grab two sets of docs and sort them. When someone clicks
    // "load more" we grab another set of docs and sort them. This can result
    // in new docs appearing above the "load more" button because they were
    // modified more recently than the docs that were already loaded.

    return this.args.docs.filter((doc) => {
      if (!doc.modifiedTime) {
        this.docGroupFour.push(doc);
      } else {
        const modifiedTime = new Date(doc.modifiedTime * 1000).getTime();
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
        const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

        if (modifiedTime > thirtyDaysAgo) {
          this.docGroupOne.push(doc);
        } else if (modifiedTime > ninetyDaysAgo) {
          this.docGroupTwo.push(doc);
        } else if (modifiedTime > oneYearAgo) {
          this.docGroupThree.push(doc);
        } else {
          this.docGroupFour.unshift(doc);
        }
      }
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "My::Docs": typeof MyDocsComponent;
  }
}
