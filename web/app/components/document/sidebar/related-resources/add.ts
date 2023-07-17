import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { next } from "@ember/runloop";
import { assert } from "@ember/debug";
import { restartableTask } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
} from "hermes/components/document/sidebar/related-resources";
import isValidURL from "hermes/utils/is-valid-u-r-l";

interface DocumentSidebarRelatedResourcesAddComponentSignature {
  Element: null;
  Args: {
    onClose: () => void;
    addResource: (resource: RelatedResource) => void;
    shownDocuments: Record<string, HermesDocument>;
    objectID?: string;
    relatedDocuments: RelatedHermesDocument[];
    relatedLinks: RelatedExternalLink[];
    search: (dd: any, query: string, shouldIgnoreDelay?: boolean) => Promise<void>;
    allowAddingExternalLinks?: boolean;
    headerTitle: string;
    inputPlaceholder: string;
    searchErrorIsShown?: boolean;
    searchIsRunning?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesAddComponent extends Component<DocumentSidebarRelatedResourcesAddComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare flashMessages: FlashMessageService;

  /**
   * The value of the search input. Used to query Algolia for documents,
   * or to set the URL of an external resource.
   */
  @tracked protected query = "";

  /**
   * Whether the query is a URL and not a document search.
   * True if the text entered is deemed valid by the isValidURL utility.
   */
  @tracked protected queryIsURL = false;

  /**
   * The DOM element of the search input. Receives focus when inserted.
   */
  @tracked private searchInput: HTMLInputElement | null = null;

  /**
   * Whether to allow navigating with the keyboard.
   * True unless the search input has lost focus.
   */
  @tracked keyboardNavIsEnabled = true;

  /**
   * The title of the external link, as set by the optional input.
   * Used to set the name of the external resource.
   */
  @tracked externalLinkTitle = "";

  /**
   * Whether the URL already exists as a related resource.
   * Used to prevent duplicates in the array.
   */
  @tracked linkIsDuplicate = false;

  /**
   * Whether an error is shown below a the external link title input.
   * True if the input is empty on submit.
   */
  @tracked externalLinkTitleErrorIsShown = false;

  /**
   * Whether a query has no results.
   * May determine whether the list header (e.g., "suggestions," "results") is shown.
   */
  private get noMatchesFound(): boolean {
    const objectEntriesLengthIsZero =
      Object.entries(this.args.shownDocuments).length === 0;

    if (this.args.allowAddingExternalLinks) {
      return objectEntriesLengthIsZero && !this.queryIsURL;
    } else {
      return objectEntriesLengthIsZero;
    }
  }

  /**
   * Whether the list element is displayed.
   * True unless the query is a URL and adding external links is allowed.
   */
  protected get listIsShown(): boolean {
    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsURL;
    } else {
      return true;
    }
  }

  /**
   * Whether to show a header above the search results (e.g., "suggestions", "results")
   * True when there's results to show.
   */
  protected get listHeaderIsShown(): boolean {
    if (this.noMatchesFound) {
      return false;
    }

    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsURL;
    }

    return true;
  }
  /**
   * Whether the query is empty.
   * Helps determine whether the "no results" message.
   */
  private get queryIsEmpty(): boolean {
    return this.query.length === 0;
  }

  /**
   * Whether the "no results" message is hidden.
   * False when a search error is shown, or when,
   * if allowing external links, the query is a URL or empty.
   */
  protected get noResultsMessageIsHidden(): boolean {
    if (this.args.searchErrorIsShown) {
      return false;
    }
    if (this.args.allowAddingExternalLinks) {
      return this.queryIsURL || this.queryIsEmpty;
    } else {
      return false;
    }
  }

  /**
   * The action to disable keyboard navigation.
   * Called when the search input loses focus.
   */
  @action protected disableKeyboardNav() {
    this.keyboardNavIsEnabled = false;
  }

  /**
   * The action to enable keyboard navigation.
   * Called when the search input receives focus.
   */
  @action protected enableKeyboardNav() {
    this.keyboardNavIsEnabled = true;
  }

  @action onExternalLinkSubmit(e: Event) {
    // Prevent the form from blindly submitting
    e.preventDefault();

    if (this.externalLinkTitle.length === 0) {
      this.externalLinkTitleErrorIsShown = true;
      return;
    }

    if (!this.linkIsDuplicate) {
      this.addRelatedExternalLink();
      this.args.onClose();
    }
  }

  /**
   * The action passed to the XDropdownList component, to be run when an item is clicked.
   * Adds the clicked document to the related-documents array in the correct format.
   */
  @action protected onItemClick(_item: any, attrs: any) {
    const relatedHermesDocument = {
      googleFileID: attrs.objectID,
      title: attrs.title,
      type: attrs.docType,
      documentNumber: attrs.docNumber,
      sortOrder: 1,
    } as RelatedHermesDocument;

    this.args.addResource(relatedHermesDocument);
  }

  /**
   * The action that updates the locally tracked externalLinkTitle property.
   * Called when the Title input changes.
   */
  @action protected onExternalLinkTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.externalLinkTitle = input.value;
  }

  /**
   * The action to check for duplicate ExternalResources.
   * Used to dictate whether a warning message is displayed.
   */
  @action private checkForDuplicate(url: string) {
    const isDuplicate = this.args.relatedLinks.find((link) => {
      return link.url === url;
    });
    if (isDuplicate) {
      this.linkIsDuplicate = true;
    } else {
      this.linkIsDuplicate = false;
    }
  }

  /**
   * The action to add an external link to a document.
   * Correctly formats the link data and saves it, unless it already exists.
   */
  @action addRelatedExternalLink() {
    let externalLink = {
      url: this.query,
      name: this.externalLinkTitle || this.query,
      sortOrder: 1,
    };

    this.checkForDuplicate(externalLink.url);

    if (!this.linkIsDuplicate) {
      this.args.addResource(externalLink);
      void this.args.search(null, "");
      this.externalLinkTitle = "";
      this.args.onClose();
    }
  }

  /**
   * Keyboard listener for the search input.
   * Allows "enter" to add external links.
   * Prevents the default ArrowUp/ArrowDown actions
   * so they can be handled by the XDropdownList component.
   */
  @action protected onInputKeydown(dd: any, e: KeyboardEvent) {
    if (e.key === "Enter") {
      if (this.queryIsURL) {
        this.onExternalLinkSubmit(e);
        return;
      }
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (!this.query.length) {
        e.preventDefault();
        return;
      }
    }

    dd.onTriggerKeydown(dd.contentIsShown, dd.showContent, e);
  }

  /**
   * The action run when the search input is inserted.
   * Saves the input locally, loads initial data, then
   * focuses the search input.
   */
  @action protected didInsertInput(dd: any, e: HTMLInputElement) {
    this.searchInput = e;
    void this.loadInitialData.perform(dd);

    next(() => {
      assert("searchInput expected", this.searchInput);
      this.searchInput.focus();
    });
  }

  /**
   * The action that runs when the search-input value changes.
   * Updates the local query property, checks if it's a URL, and searches Algolia.
   */
  @action protected onInput(dd: any, e: Event) {
    const input = e.target as HTMLInputElement;
    this.query = input.value;
    this.checkURL();
    void this.args.search(dd, this.query);
  }

  /**
   * The action to check if a URL is valid, and, if so,
   * whether it's a duplicate.
   */
  @action private checkURL() {
    this.queryIsURL = isValidURL(this.query);
    if (this.queryIsURL) {
      this.checkForDuplicate(this.query);
    }
  }

  /**
   * The task that loads the initial `algoliaResults`.
   * Sends an empty-string query to Algolia, effectively populating its
   * "suggestions." Called when the search input is inserted.
   */
  protected loadInitialData = restartableTask(async (dd: any) => {
    await this.args.search(dd, "", true);
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add": typeof DocumentSidebarRelatedResourcesAddComponent;
  }
}
