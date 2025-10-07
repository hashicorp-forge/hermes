import { restartableTask, task } from "ember-concurrency";
import Component from "@glimmer/component";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import SearchService from "hermes/services/search";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import ConfigService from "hermes/services/config";
import { next, schedule } from "@ember/runloop";
import { isTesting } from "@embroider/macros";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import StoreService from "hermes/services/store";
import FetchService from "hermes/services/fetch";
import { HermesProjectHit } from "hermes/types/project";
import { SearchScope } from "hermes/routes/authenticated/results";

export interface SearchResultObjects {
  [key: string]: unknown | HermesDocumentObjects | HermesProjectHitObjects;
}

export interface HermesDocumentObjects {
  [key: string]: HermesDocument;
}

export interface HermesProjectHitObjects {
  [key: string]: {
    hit: HermesProjectHit;
  };
}

interface HeaderSearchComponentSignature {
  Element: HTMLDivElement;
  Args: {
    query?: string;
  };
}

export default class HeaderSearchComponent extends Component<HeaderSearchComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare searchService: SearchService;
  @service declare router: RouterService;
  @service declare store: StoreService;

  protected viewAllID = "global-search-view-all";
  protected projectsID = "global-search-projects";
  protected productAreaID = "global-search-product-area";
  protected documentsID = "global-search-documents";
  protected viewAllSelector = `#${this.viewAllID}`;
  protected projectsSelector = `#${this.projectsID}`;
  protected productAreaSelector = `#${this.productAreaID}`;
  protected documentsSelector = `#${this.documentsID}`;

  /**
   * Whether there has been a search during this session.
   * Used to determine whether to search a query on focus.
   * Set true the first time a search is performed.
   * See `maybeSearch` task for more context.
   */
  @tracked private hasSearched = false;

  @tracked protected searchInput: HTMLInputElement | null = null;
  @tracked protected searchInputIsEmpty = true;
  @tracked protected docMatches: HermesDocument[] = [];
  @tracked protected productAreaMatch: string | null = null;
  @tracked protected projectMatches: HermesProjectHit[] = [];
  @tracked protected viewAllResultsLink: HTMLAnchorElement | null = null;
  @tracked protected query: string = this.args.query ?? "";

  protected get viewAllResultsQuery() {
    return {
      q: this.query,
      scope: SearchScope.All,
      page: 1,
      docType: [],
      product: [],
      owners: [],
      status: [],
    };
  }

  protected get items() {
    const viewAllDocResults =
      (this.docMatches.length > 0 && {
        viewAllResults: true,
      }) ||
      undefined;

    const productAreaMatch = this.productAreaMatch && {
      productAreaName: this.productAreaMatch,
    };

    const projectItems = this.projectMatches.map((hit) => {
      return {
        hit,
      };
    });

    const items = [
      productAreaMatch,
      ...projectItems,
      ...this.docMatches,
      viewAllDocResults,
    ].filter(Boolean);

    return items ?? [];
  }

  /**
   * If the user presses enter and there's no focused item,
   * then the "View All Results" link is clicked and the dropdown is closed.
   */
  @action maybeSubmitForm(dd: XDropdownListAnchorAPI, e: KeyboardEvent): void {
    if (e.key === "Enter") {
      // Prevent the form from submitting, which causes a page reload
      e.preventDefault();

      // if there's a search and no focused item, view all results
      if (dd.focusedItemIndex === -1 && this.query.length) {
        // Ignore the event if the popover is shown and there's no results
        if (dd.contentIsShown && this.items.length === 0) {
          return;
        } else {
          // Cancel real-time search and kick off a transition to `/results`
          this.search.cancelAll();
          this.viewAllResults(dd);
        }
      }
    }
  }

  /**
   * The action to run when the input is inserted.
   * Registers the input so can we focus it later.
   */
  @action protected registerInput(element: HTMLInputElement): void {
    this.searchInput = element;
  }

  /**
   * The action run when on document keydown.
   * If the user presses cmd+k, we focus the input.
   */
  @action protected maybeFocusInput(e: KeyboardEvent): void {
    if (e.metaKey && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      assert("searchInput is expected", this.searchInput);
      this.searchInput.focus();
    }
  }

  /**
   * The action to run when the "View all results" link is inserted.
   * Registers the link so we can click it later.
   */
  @action registerViewAllResultsLink(e: HTMLAnchorElement) {
    this.viewAllResultsLink = e;
  }

  /**
   * Checks whether the dropdown is open and closes it if it is.
   * Uses mousedown instead of click to get ahead of the focusin event.
   * This allows users to click the search input to dismiss the popover.
   */
  @action protected maybeCloseDropdown(dd: XDropdownListAnchorAPI): void {
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
    if (!dd.contentIsShown && this.query.length) {
      dd.showContent();
    }
  }

  /**
   * The task to maybe search Algolia. Called onInputFocus.
   * If there's a query, but the user hasn't typed it,
   * such as when clicking a search input populated by a query param,
   * we initiate a search to avoid the "no matches" screen.
   * The `isRunning` state is passed to DropdownList as `isLoading`.
   */
  protected maybeSearch = task(async () => {
    if (this.query.length && !this.hasSearched) {
      await this.search.perform();
    }
  });

  /**
   * The action run when the form is submitted, which happens when the user
   * presses enter or on a query with no focused item.
   * Clicks the "View all results" link which has already has the
   * route and query information.
   */
  @action protected viewAllResults(dd?: XDropdownListAnchorAPI): void {
    if (dd?.contentIsShown) {
      /**
       * When possible, we trigger the transition with a click
       * to avoid any potential drift from the LinkTo handler.
       */
      assert("viewAllResultsLink is expected", this.viewAllResultsLink);
      this.viewAllResultsLink.click();
      dd.hideContent();
    } else {
      /**
       * When the user hits enter before the dropdown is shown,
       * we transition to the results page using the router.
       */
      this.router.transitionTo("authenticated.results", {
        queryParams: this.viewAllResultsQuery,
      });
    }
  }

  /**
   * The task run when the search element receives input.
   * Queries Algolia for the best document matches and product area match
   * and updates the "itemsToShow" object.
   */
  protected search = restartableTask(
    async (dd?: XDropdownListAnchorAPI, inputEvent?: Event): Promise<void> => {
      let input = inputEvent?.target;

      if (input instanceof HTMLInputElement) {
        this.query = input.value;
      }

      if (this.query.length) {
        this.searchInputIsEmpty = false;

        try {
          const productSearch = this.searchService.searchForFacetValues.perform(
            this.configSvc.config.algolia_docs_index_name,
            "product",
            this.query,
            {
              hitsPerPage: 1,
            },
          );

          const docSearch = this.searchService.search.perform(this.query, {
            hitsPerPage: 5,
          });

          const projectSearch = this.searchService.searchIndex.perform(
            this.configSvc.config.algolia_projects_index_name,
            this.query,
            {
              hitsPerPage: 3,
            },
          );

          let searchResults = await Promise.all([
            productSearch,
            docSearch,
            projectSearch,
          ]).then((values) => values);

          let [productAreas, docs, projects] = searchResults;

          const hits = (docs?.hits as HermesDocument[]) ?? [];

          // Load the owner information
          await this.store.maybeFetchPeople.perform(hits);

          this.docMatches = docs ? hits : [];

          if (productAreas) {
            const firstHit = productAreas.facetHits[0];
            if (firstHit) {
              this.productAreaMatch = firstHit.value;
            } else {
              this.productAreaMatch = null;
            }
          }

          if (projects) {
            this.projectMatches = projects.hits as HermesProjectHit[];
          }

          this.hasSearched = true;
        } catch (e: unknown) {
          console.error(e);
        }
      } else {
        this.query = "";
        this.productAreaMatch = null;
        this.searchInputIsEmpty = true;

        dd?.hideContent();
        this.docMatches = [];
      }

      // Reopen the dropdown if it was closed on mousedown and there's a query
      if (!dd?.contentIsShown && this.query.length) {
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
    "Header::Search": typeof HeaderSearchComponent;
  }
}
