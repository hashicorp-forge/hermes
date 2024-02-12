import { restartableTask } from "ember-concurrency";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import AlgoliaService from "hermes/services/algolia";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import ConfigService from "hermes/services/config";
import { next, schedule } from "@ember/runloop";
import Ember from "ember";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import StoreService from "hermes/services/store";
import FetchService from "hermes/services/fetch";
import { HermesProjectHit } from "hermes/types/project";
import { LibraryTemplatePlugin } from "webpack";

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
  Args: {};
}

export default class HeaderSearchComponent extends Component<HeaderSearchComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
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

  @tracked protected searchInput: HTMLInputElement | null = null;
  @tracked protected searchInputIsEmpty = true;
  @tracked protected docMatches: HermesDocument[] = [];
  @tracked protected productAreaMatch: string | null = null;
  @tracked protected projectMatches: HermesProjectHit[] = [];
  @tracked protected viewAllResultsLink: HTMLAnchorElement | null = null;
  @tracked protected query: string = "";

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
    ].compact();

    return items ?? [];
  }

  /**
   * If the user presses enter and there's no focused item,
   * then the "View All Results" link is clicked and the dropdown is closed.
   */
  @action maybeSubmitForm(dd: XDropdownListAnchorAPI, e: KeyboardEvent): void {
    if (e.key === "Enter") {
      // Prevent the form from submitting
      e.preventDefault();

      // if there's a search and no focused item, view all results
      if (dd.focusedItemIndex === -1 && this.query.length) {
        // only submit if there are results
        if (this.items.length > 0) {
          this.viewAllResults();
          dd.hideContent();
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
   * The action run when the form is submitted, which happens when the user
   * presses enter or on a query with no focused item.
   * Clicks the "View all results" link which has already has the
   * route and query information.
   */
  @action protected viewAllResults(): void {
    assert("viewAllResultsLink is expected", this.viewAllResultsLink);
    this.viewAllResultsLink.click();
  }

  /**
   * The task run when the search element receives input.
   * Queries Algolia for the best document matches and product area match
   * and updates the "itemsToShow" object.
   */
  protected search = restartableTask(
    async (dd: any, inputEvent: Event): Promise<void> => {
      let input = inputEvent.target;

      assert(
        "inputEvent.target must be an HTMLInputElement",
        input instanceof HTMLInputElement,
      );

      this.query = input.value;

      if (this.query.length) {
        this.searchInputIsEmpty = false;

        try {
          const productSearch = this.algolia.searchForFacetValues.perform(
            this.configSvc.config.algolia_docs_index_name,
            "product",
            this.query,
            {
              hitsPerPage: 1,
            },
          );

          const docSearch = this.algolia.search.perform(this.query, {
            hitsPerPage: 5,
          });

          const projectSearch = this.algolia.searchIndex.perform(
            this.configSvc.config.algolia_projects_index_name,
            this.query,
            {
              hitsPerPage: 5,
            },
          );

          let algoliaResults = await Promise.all([
            productSearch,
            docSearch,
            projectSearch,
          ]).then((values) => values);

          let [productAreas, docs, projects] = algoliaResults;

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
        } catch (e: unknown) {
          console.error(e);
        }
      } else {
        this.query = "";
        this.productAreaMatch = null;
        this.searchInputIsEmpty = true;

        dd.hideContent();
        this.docMatches = [];
      }

      // Reopen the dropdown if it was closed on mousedown and there's a query
      if (!dd.contentIsShown && this.query.length) {
        dd.showContent();
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
      if (Ember.testing) {
        schedule("afterRender", () => {
          dd.resetFocusedItemIndex();
          dd.scheduleAssignMenuItemIDs();
        });
      } else {
        next(() => {
          dd.resetFocusedItemIndex();
          dd.scheduleAssignMenuItemIDs();
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
