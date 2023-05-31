import { restartableTask } from "ember-concurrency";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import AlgoliaService from "hermes/services/algolia";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import { OffsetOptions } from "@floating-ui/dom";
import ConfigService from "hermes/services/config";
import { next } from "@ember/runloop";

export interface SearchResultObjects {
  [key: string]: unknown | HermesDocumentObjects;
}

export interface HermesDocumentObjects {
  [key: string]: HermesDocument;
}

const POPOVER_CROSS_AXIS_OFFSET = 3;
const POPOVER_BORDER_WIDTH = 1;

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
  @tracked protected _productAreaMatch: HermesDocument | null = null;
  @tracked protected viewAllResultsLink: HTMLAnchorElement | null = null;
  @tracked protected query: string = "";

  get bestMatchesHeaderIsShown(): boolean {
    return Object.keys(this.bestMatches).length > 1;
  }

  get dropdownListStyle(): string {
    return `width: calc(100% + ${
      POPOVER_BORDER_WIDTH + POPOVER_CROSS_AXIS_OFFSET
    }px)`;
  }

  get popoverOffset(): OffsetOptions {
    return {
      mainAxis: 0,
      crossAxis: POPOVER_CROSS_AXIS_OFFSET,
    };
  }

  get bestMatches(): SearchResultObjects {
    return this._bestMatches.reduce(
      (acc, doc) => {
        acc[doc.objectID] = doc;
        return acc;
      },
      {
        viewAllResultsObject: {},
        ...(this._productAreaMatch && {
          productAreaMatch: this._productAreaMatch,
        }),
      } as SearchResultObjects
    );
  }

  @action onInputKeydown(dd: any, e: KeyboardEvent): void {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (!this.query.length) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === "Enter" && dd.focusedItemIndex === -1) {
      if (!dd.selected) {
        e.preventDefault();
        this.viewAllResults();
        dd.hideContent();
      }
    }

    dd.onTriggerKeydown(dd.contentIsShown, dd.showContent, e);
  }

  @action protected registerInput(element: HTMLInputElement): void {
    this.searchInput = element;
  }

  @action protected onDocumentKeydown(e: KeyboardEvent): void {
    if (e.metaKey && e.key === "k") {
      e.preventDefault();
      assert("searchInput is expected", this.searchInput);
      this.searchInput.focus();
    }
  }

  @action registerViewAllResultsLink(e: HTMLAnchorElement) {
    this.viewAllResultsLink = e;
  }

  /**
   * Checks whether the dropdown is open and closes it if it is.
   * Uses mousedown instead of click to get ahead of the focusin event.
   * This allows users to click the search input to dismiss the dropdown.
   */
  @action protected maybeCloseDropdown(dd: any): void {
    if (dd.contentIsShown) {
      dd.hideContent();
    }
  }

  @action protected maybeOpenDropdown(dd: any): void {
    if (!dd.contentIsShown && this.query.length) {
      dd.showContent();
    }
  }

  @action protected viewAllResults(): void {
    assert("viewAllResultsLink is expected", this.viewAllResultsLink);
    this.viewAllResultsLink.click();
  }

  protected search = restartableTask(
    async (dd: any, inputEvent: InputEvent): Promise<void> => {
      let input = inputEvent.target;

      assert(
        "inputEvent.target must be an HTMLInputElement",
        input instanceof HTMLInputElement
      );

      this.query = input.value;

      if (this.query.length) {
        this.searchInputIsEmpty = false;

        const productSearch = this.algolia.searchIndex.perform(
          this.configSvc.config.algolia_docs_index_name + "_product_areas",
          this.query,
          {
            hitsPerPage: 1,
          }
        );

        const docSearch = this.algolia.search.perform(this.query, {
          hitsPerPage: 5,
        });

        let algoliaResults = await Promise.all([productSearch, docSearch]).then(
          (values) => values
        );

        let [productAreas, docs] = algoliaResults;

        console.log("productAreas", productAreas);
        console.log("docs", docs);

        this._bestMatches = docs
          ? (docs.hits.slice(0, 5) as HermesDocument[])
          : [];
        this._productAreaMatch = productAreas
          ? (productAreas.hits[0] as HermesDocument)
          : null;
      } else {
        this._productAreaMatch = null;
        this.searchInputIsEmpty = true;
        dd.hideContent();
        this._bestMatches = [];
      }

      // Reopen the dropdown if it was closed on mousedown
      if (!dd.contentIsShown) {
        dd.showContent();
      }

      // Although the `dd.scheduleAssignMenuItemIDs` method runs `afterRender`,
      // it doesn't provide enough time for `in-element` to update.
      // Therefore, we wait for the next run loop when the DOM is updated.
      next(() => {
        dd.resetFocusedItemIndex();
        dd.scheduleAssignMenuItemIDs();
      });
    }
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Search": typeof HeaderSearchComponent;
  }
}
