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

export interface SearchResultObjects {
  [key: string]: unknown | HermesDocumentObjects;
}

export interface HermesDocumentObjects {
  [key: string]: HermesDocument;
}

interface HeaderSearchComponentSignature {
  Element: HTMLDivElement;
  Args: {};
}

export default class HeaderSearchComponent extends Component<HeaderSearchComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare router: RouterService;

  @tracked protected searchInput: HTMLInputElement | null = null;
  @tracked protected searchInputIsEmpty = true;
  @tracked protected _bestMatches: HermesDocument[] = [];
  @tracked protected _productAreaMatch: string | null = null;
  @tracked protected viewAllResultsLink: HTMLAnchorElement | null = null;
  @tracked protected query: string = "";

  /**
   * Whether to show the "Best Matches" header.
   * True if there's at least one match.
   */
  get bestMatchesHeaderIsShown(): boolean {
    return Object.keys(this.itemsToShow).length > 1;
  }

  /**
   * The items to show in the dropdown.
   * Always shows the "View All Results" link.
   * Conditionally shows the "View all [productArea]" link
   * and any document matches.
   */
  get itemsToShow(): SearchResultObjects {
    return this._bestMatches.reduce(
      (acc, doc) => {
        acc[doc.objectID] = doc;
        return acc;
      },
      {
        viewAllResultsObject: {
          itemShouldRenderOut: true,
        },
        ...(this._productAreaMatch && {
          productAreaMatch: {
            itemShouldRenderOut: true,
            productAreaName: this._productAreaMatch,
          },
        }),
      } as SearchResultObjects
    );
  }

  /**
   * If the user presses enter and there's no focused item,
   * then the "View All Results" link is clicked and the dropdown is closed.
   */
  @action maybeSubmitForm(dd: any, e: KeyboardEvent): void {
    if (e.key === "Enter") {
      // Prevent the form from submitting
      e.preventDefault();

      // if there's a search and no focused item, view all results
      if (dd.focusedItemIndex === -1 && this.query.length) {
        this.viewAllResults();
        dd.hideContent();
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
  @action protected maybeCloseDropdown(dd: any): void {
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
  @action protected maybeOpenDropdown(dd: any): void {
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
        input instanceof HTMLInputElement
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
            }
          );

          const docSearch = this.algolia.search.perform(this.query, {
            hitsPerPage: 5,
          });

          let algoliaResults = await Promise.all([
            productSearch,
            docSearch,
          ]).then((values) => values);

          let [productAreas, docs] = algoliaResults;

          this._bestMatches = docs
            ? (docs.hits.slice(0, 5) as HermesDocument[])
            : [];
          if (productAreas) {
            const firstHit = productAreas.facetHits[0];
            if (firstHit) {
              this._productAreaMatch = firstHit.value;
            } else {
              this._productAreaMatch = null;
            }
          }
        } catch (e: unknown) {
          console.error(e);
        }
      } else {
        this.query = "";
        this._productAreaMatch = null;
        this.searchInputIsEmpty = true;

        dd.hideContent();
        this._bestMatches = [];
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
    }
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Search": typeof HeaderSearchComponent;
  }
}
