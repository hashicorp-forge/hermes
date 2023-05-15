import { restartableTask } from "ember-concurrency";
import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import AlgoliaService from "hermes/services/algolia";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";

interface BasicDropdownAPI {
  uniqueId: string;
  isOpen: boolean;
  disabled: boolean;
  actions: {
    close: () => void;
    open: () => void;
    toggle: () => void;
    reposition: () => void;
  };
}

interface SearchResultObjects {
  [key: string]: unknown | HermesDocumentObjects;
}

interface HermesDocumentObjects {
  [key: string]: HermesDocument;
}

export default class Search extends Component {
  @service declare algolia: AlgoliaService;
  @service declare router: RouterService;

  @tracked protected searchInput: HTMLInputElement | null = null;
  @tracked protected _bestMatches: HermesDocument[] = [];
  @tracked protected query: string = "";

  get bestMatchesHeaderIsShown(): boolean {
    return Object.keys(this.bestMatches).length > 1;
  }

  get bestMatches(): SearchResultObjects {
    return this._bestMatches.reduce(
      (acc, doc) => {
        acc[doc.objectID] = doc;
        return acc;
      },
      {
        viewAllResultsObject: {},
      } as SearchResultObjects
    );
  }

  @action protected registerInput(element: HTMLInputElement): void {
    this.searchInput = element;
  }

  @action protected onKeydown(e: KeyboardEvent): void {
    if (e.metaKey && e.key === "k") {
      e.preventDefault();
      assert("searchInput is expected", this.searchInput);
      this.searchInput.focus();
    }
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

  @action protected goToResults(ev: Event): void {
    ev.preventDefault();
    this.router.transitionTo("authenticated.results", {
      queryParams: { q: this.query },
    });
  }

  protected search = restartableTask(
    async (dd: any, inputEvent: InputEvent): Promise<void> => {
      let input = inputEvent.target;

      assert(
        "inputEvent.target must be an HTMLInputElement",
        input instanceof HTMLInputElement
      );

      this.query = input.value;

      if (this.query) {
        const params = {
          hitsPerPage: 5,
        };
        const response = await this.algolia.search.perform(this.query, params);

        if (response) {
          this._bestMatches = response.hits as HermesDocument[];
        }
      }

      // Reopen the dropdown if it was closed on mousedown
      if (!dd.contentIsShown) {
        dd.showContent();
      }
      dd.resetFocusedItemIndex();
      dd.scheduleAssignMenuItemIDs();
    }
  );
}
