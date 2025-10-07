import Component from "@glimmer/component";
import { action } from "@ember/object";
import { service } from "@ember/service";
import {
  FacetDropdownGroups,
  FacetDropdownObjectDetails,
  FacetDropdownObjects,
} from "hermes/types/facets";
import ActiveFiltersService from "hermes/services/active-filters";
import { next, schedule } from "@ember/runloop";
import { SearchScope } from "hermes/routes/authenticated/results";
import { assert } from "@ember/debug";
import DocumentTypesService from "hermes/services/document-types";
import ProductAreasService from "hermes/services/product-areas";
import { tracked } from "@glimmer/tracking";
import { restartableTask, task } from "ember-concurrency";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import SearchService from "hermes/services/search";
import ConfigService from "hermes/services/config";
import { SearchForFacetValuesResponse } from "instantsearch.js";
import { isTesting } from "@embroider/macros";
import { ProjectStatus } from "hermes/types/project-status";
import StoreService from "hermes/services/_store";
import PersonModel from "hermes/models/person";

export enum SortByValue {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export enum SortByLabel {
  Newest = "Newest",
  Oldest = "Oldest",
}

export enum FacetName {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export interface SortByFacets {
  [name: string]: {
    count: number;
    isSelected: boolean;
  };
}

interface FacetArrayItem {
  name: FacetName;
  values: FacetDropdownObjects | null;
}

export type ActiveFilters = {
  [name in FacetName]: string[];
};

interface ToolbarComponentSignature {
  Args: {
    facets?: Partial<FacetDropdownGroups>;
    scope?: SearchScope;
    query?: string;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare search: SearchService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare documentTypes: DocumentTypesService;
  @service declare productAreas: ProductAreasService;
  @service declare store: StoreService;
  /**
   * Whether there has been a search during this session.
   * Used to determine whether to search a query on focus.
   * Set true the first time a search is performed.
   * See `maybeSearch` task for more context.
   */
  @tracked private hasSearched = false;

  /**
   * Whether the owners input is empty.
   * Dictates when the dropdown is shown,
   */
  @tracked protected searchInputIsEmpty = true;

  /**
   * The query for the owner facet. Updated on input
   * and reset on selection.
   */
  @tracked protected ownerQuery = "";

  /**
   * The results of an ownerSearch, if any.
   * Looped through by the DropdownList component.
   */
  @tracked protected ownerResults: string[] | undefined = undefined;

  protected get ownerFacetIsShown() {
    return this.args.scope !== SearchScope.Projects;
  }

  /**
   * Whether the facets are shown.
   * True as long as the scope is not "All".
   */
  protected get facetsAreShown() {
    return this.args.scope !== SearchScope.All;
  }

  /**
   * Whether the owners input is disabled.
   * True if there are no owners in the facets object.
   */
  protected get ownersInputIsDisabled() {
    return !this.args.facets || Object.keys(this.args.facets).length === 0;
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects {
    let statuses: FacetDropdownObjects = {};

    for (let status in this.args.facets?.status) {
      switch (status) {
        case "Approved":
        case "In-Review":
        case "In Review":
        case "Obsolete":
        case "WIP":
        case `${ProjectStatus.Active}`:
        case `${ProjectStatus.Completed}`:
        case `${ProjectStatus.Archived}`:
          statuses[status] = this.args.facets?.status[
            status
          ] as FacetDropdownObjectDetails;
      }
    }

    return Object.fromEntries(Object.entries(statuses).sort());
  }

  /**
   * The facets, depending on the scope.
   * If the facets object is empty, we return the default facets.
   * Otherwise, we return the facets from the object.
   * If the scope is "Docs", we replaces the "status" facet with
   * the statuses from our getter.
   */
  protected get facets() {
    assert("facets must exist", this.args.facets);
    let facetArray: FacetArrayItem[] = [];

    Object.entries(this.args.facets).forEach(([key, value]) => {
      const name = key as FacetName;

      // Sort the values alphabetically
      const values = value
        ? Object.fromEntries(Object.entries(value).sort())
        : null;

      switch (name) {
        case FacetName.Owners:
          // We handle this with a text input
          break;
        case FacetName.Status:
          if (values) {
            facetArray.push({
              name,
              values: this.statuses,
            });
          }
          break;
        default:
          facetArray.push({
            name,
            values,
          });
          break;
      }
    });

    const order = [
      FacetName.DocType,
      FacetName.Status,
      FacetName.Product,
      FacetName.Owners,
    ];

    facetArray.sort((a, b) => {
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

    return facetArray;
  }

  /**
   * The action to reset the owner-query-related properties.
   * Called when the input is manually cleared, and when an item is selected.
   */
  @action protected resetOwnersQuery() {
    this.ownerQuery = "";
    this.ownerResults = undefined;
    this.searchInputIsEmpty = true;
  }

  /**
   * Checks whether the dropdown is open and closes it if it is.
   * Uses mousedown instead of click to get ahead of the focusin event.
   * This allows users to click the search input to dismiss the popover.
   */
  @action protected maybeCloseDropdown(dd: XDropdownListAnchorAPI) {
    if (dd.contentIsShown) {
      dd.hideContent();
    }
  }

  /**
   * The action run on input focusin.
   * If the popover is closed but the input has a value,
   * we open the popover.
   * @param dd
   */
  @action protected maybeOpenDropdown(dd: XDropdownListAnchorAPI): void {
    if (!dd.contentIsShown && this.ownerQuery.length) {
      dd.showContent();
    }
  }

  /**
   * Closes the dropdown on the next run loop.
   * Done so we don't interfere with Ember's <LinkTo> handling.
   */
  @action protected delayedCloseDropdown(closeDropdown: () => void) {
    next(() => {
      closeDropdown();
    });
  }

  /**
   * The task to maybe search Algolia. Called onInputFocus.
   * If there's a query, but the user hasn't typed it,
   * such as when clicking a search input populated by a query param,
   * we initiate a search to avoid the "no matches" screen.
   * The `isRunning` state is passed to DropdownList as `isLoading`.
   */
  protected maybeSearch = task(async () => {
    if (this.ownerQuery.length && !this.hasSearched) {
      await this.searchOwners.perform();
    }
  });

  /**
   * The task to query Algolia for the owner facet.
   * Runs on the `input` event. Populates the dropdown with results.
   */
  protected searchOwners = restartableTask(
    async (dd?: XDropdownListAnchorAPI, e?: Event) => {
      const input = e?.target;

      if (input instanceof HTMLInputElement) {
        this.ownerQuery = input.value;
      }

      if (this.ownerQuery.length) {
        this.searchInputIsEmpty = false;
        try {
          const searchResultsPromise = this.search.searchForFacetValues
            .perform(
              this.configSvc.config.algolia_docs_index_name,
              "owners",
              this.ownerQuery,
              {
                filters: this.activeFilters.index[FacetName.Owners]
                  .map((owner) => `NOT owners:${owner}`)
                  .join(" AND "),
              },
            )
            .then((results) => {
              assert("facetHits must exist", results && "facetHits" in results);
              return results.facetHits;
            });

          const peoplePromise = this.store.query("person", {
            query: this.ownerQuery,
          });

          const [searchResults, peopleResults] = await Promise.all([
            searchResultsPromise,
            peoplePromise,
          ]);

          let people: string[] = [];

          if (peopleResults.length) {
            people = peopleResults
              .map((p: PersonModel) => p.email)
              .filter((email: string) => {
                return (
                  !this.activeFilters.index[FacetName.Owners].includes(email) &&
                  !searchResults.some((result) => result.value === email)
                );
              });
          }
          this.ownerResults = searchResults
            .map((result) => result.value)
            .concat(people);
        } catch (e) {
          console.error(e);
        }
      } else {
        dd?.hideContent();
        this.resetOwnersQuery();
      }

      // Reopen the dropdown if it was closed on mousedown and there's a query
      if (!dd?.contentIsShown && this.ownerQuery.length) {
        dd?.showContent();
      }

      /**
       * Although `dd.scheduleAssignMenuItemIDs` runs `afterRender`,
       * it doesn't provide enough time for `in-element` to update.
       * Therefore, we wait for the next run loop.
       *
       * This approach causes issues when testing, so we
       * use `schedule` as an approximation.
       *
       * TODO: Improve this.
       */
      if (isTesting()) {
        schedule("afterRender", () => {
          dd?.resetFocusedItemIndex();
          dd?.scheduleAssignMenuItemIDs();
        });
      } else {
        next(() => {
          dd?.resetFocusedItemIndex();
          dd?.scheduleAssignMenuItemIDs();
        });
      }
    },
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Toolbar": typeof ToolbarComponent;
  }
}
