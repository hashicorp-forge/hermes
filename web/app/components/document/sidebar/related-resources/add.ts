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
import FetchService from "hermes/services/fetch";
import { XDropdownListAnchorAPI } from "hermes/components/x/dropdown-list";
import { SearchOptions } from "instantsearch.js";

interface DocumentSidebarRelatedResourcesAddComponentSignature {
  Element: null;
  Args: {
    onClose: () => void;
    addResource: (resource: RelatedResource) => void;
    shownDocuments: Record<string, HermesDocument>;
    objectID?: string;
    relatedDocuments: RelatedHermesDocument[];
    relatedLinks: RelatedExternalLink[];
    search: (
      dd: XDropdownListAnchorAPI | null,
      query: string,
      shouldIgnoreDelay?: boolean,
      options?: SearchOptions
    ) => Promise<void>;
    getObject: (
      dd: XDropdownListAnchorAPI | null,
      id: string
    ) => Promise<HermesDocument | undefined>;
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

enum RelatedResourceQueryType {
  AlgoliaSearch = "algoliaSearch",
  AlgoliaSearchWithFilters = "algoliaSearchWithFilters",
  AlgoliaGetObject = "algoliaGetObject",
  ExternalLink = "externalLink",
}

enum FirstPartyURLFormat {
  ShortLink = "shortLink",
  FullURL = "fullURL",
}

export default class DocumentSidebarRelatedResourcesAddComponent extends Component<DocumentSidebarRelatedResourcesAddComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flashMessages: FlashMessageService;

  @tracked queryType = RelatedResourceQueryType.AlgoliaSearch;
  @tracked firstPartyURLFormat: FirstPartyURLFormat | null = null;

  @tracked private _dd: XDropdownListAnchorAPI | null = null;

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

  protected get shownDocuments() {
    if (this.linkIsDuplicate) {
      return {};
    }
    return this.args.shownDocuments;
  }

  protected get queryIsExternalURL() {
    return this.queryType === RelatedResourceQueryType.ExternalLink;
  }

  /**
   * Whether a query has no results.
   * May determine whether the list header (e.g., "suggestions," "results") is shown.
   */
  private get noMatchesFound(): boolean {
    const objectEntriesLengthIsZero =
      Object.entries(this.args.shownDocuments).length === 0;

    if (this.args.allowAddingExternalLinks) {
      return objectEntriesLengthIsZero && this.queryIsFirstPartyURL(this.query);
    } else {
      return objectEntriesLengthIsZero;
    }
  }

  private get shortLinkBaseURL() {
    return this.configSvc.config.short_link_base_url;
  }

  private get dd(): XDropdownListAnchorAPI {
    assert("dd expected", this._dd);
    return this._dd;
  }

  /**
   * Whether the list element is displayed.
   * True unless the query is a URL and adding external links is allowed.
   */
  protected get listIsShown(): boolean {
    // we don't want to necessarily gate this behind `allowAddingExternalLinks`
    // since we now have the concept of first-party URLs that we can search for.
    // TODO: Handle this logic.

    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsExternalURL;
    } else {
      return true;
    }
  }

  protected get noMatchesMessage() {
    if (this.args.searchErrorIsShown) {
      return "Search error. Type to retry.";
    }
    if (this.linkIsDuplicate) {
      return "This doc has already been added.";
    }
    return "No results found";
  }
  /**
   * Whether to show a header above the search results (e.g., "suggestions", "results")
   * True when there's results to show.
   */
  protected get listHeaderIsShown(): boolean {
    if (this.noMatchesFound) {
      return false;
    }

    if (this.queryIsFirstPartyURL(this.query)) {
      if (this.queryType === RelatedResourceQueryType.ExternalLink) {
        return false;
      }
      return !this.linkIsDuplicate;
    }

    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsExternalURL;
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
      return this.queryIsExternalURL || this.queryIsEmpty;
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
  @action private checkForDuplicate(
    urlOrID: string,
    resourceIsHermesDocument = false
  ) {
    let isDuplicate = false;
    if (resourceIsHermesDocument) {
      isDuplicate = !!this.args.relatedDocuments.find((document) => {
        return document.googleFileID === urlOrID;
      });
    } else {
      isDuplicate = !!this.args.relatedLinks.find((link) => {
        return link.url === urlOrID;
      });
    }
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
  @action private addRelatedExternalLink() {
    let externalLink = {
      url: this.query,
      name: this.externalLinkTitle || this.query,
      sortOrder: 1,
    };

    // see if this is already covered
    this.checkForDuplicate(externalLink.url);

    if (!this.linkIsDuplicate) {
      this.args.addResource(externalLink);
      void this.args.search(null, "");
      this.externalLinkTitle = "";
      this.args.onClose();
    }
  }

  /**
   * The action run when the search input is inserted.
   * Saves the input locally, loads initial data, then
   * focuses the search input.
   */
  @action protected didInsertInput(
    dd: XDropdownListAnchorAPI,
    e: HTMLInputElement
  ) {
    this.searchInput = e;
    this._dd = dd;
    this.dd.registerAnchor(this.searchInput);
    void this.loadInitialData.perform();

    next(() => {
      assert("searchInput expected", this.searchInput);
      this.searchInput.focus();
    });
  }

  /**
   * Keyboard listener for the search input.
   * Allows "enter" to add external links.
   * Prevents the default ArrowUp/ArrowDown actions
   * so they can be handled by the XDropdownList component.
   */
  @action protected onInputKeydown(e: KeyboardEvent) {
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
    this.dd.onTriggerKeydown(e);
  }

  /**
   * The action that runs when the search-input value changes.
   * Updates the local query property, checks if it's a URL, and searches Algolia.
   */
  @action protected onInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.query = input.value;

    this.processQueryType();
    this.handleQuery();
  }

  /**
   * Processes the query to determine if it's a document search or a URL.
   * If it's a URL, checks if it's a first- or third-party link.
   */
  @action private processQueryType() {
    this.queryIsURL = isValidURL(this.query);

    if (this.queryIsURL) {
      if (this.queryIsFirstPartyURL(this.query)) {
        switch (this.firstPartyURLFormat) {
          case FirstPartyURLFormat.ShortLink:
            this.queryType = RelatedResourceQueryType.AlgoliaSearchWithFilters;
            return;
          case FirstPartyURLFormat.FullURL:
            this.queryType = RelatedResourceQueryType.AlgoliaGetObject;
            return;
        }
      }
      this.queryType = RelatedResourceQueryType.ExternalLink;
      return;
    }
    this.queryType = RelatedResourceQueryType.AlgoliaSearch;
  }

  @action private handleQuery() {
    switch (this.queryType) {
      case RelatedResourceQueryType.AlgoliaSearch:
        void this.args.search(this.dd, this.query);
        break;
      case RelatedResourceQueryType.AlgoliaGetObject:
        let docID = this.query.split("/document/").pop();
        if (docID === this.query) {
          // URL splitting didn't work. Treat the query as an external link.
          this.queryType = RelatedResourceQueryType.ExternalLink;
          this.handleQuery();
          break;
        }

        if (docID) {
          if (docID.includes("?draft=false")) {
            docID = docID.replace("?draft=false", "");
          }
          void this.getAlgoliaObject.perform(docID);
          break;
        } else {
          this.queryType = RelatedResourceQueryType.ExternalLink;
          this.handleQuery();
        }

      case RelatedResourceQueryType.AlgoliaSearchWithFilters:
        void this.searchWithFilters.perform();
        break;
      case RelatedResourceQueryType.ExternalLink:
        this.checkForDuplicate(this.query);

        break;
    }
  }

  @action private queryIsFirstPartyURL(url: string) {
    if (this.shortLinkBaseURL) {
      if (url.startsWith(this.shortLinkBaseURL)) {
        this.firstPartyURLFormat = FirstPartyURLFormat.ShortLink;
        return true;
      }
    }

    const currentDomain = window.location.hostname.split(".").pop();

    if (currentDomain) {
      if (url.includes(currentDomain)) {
        this.firstPartyURLFormat = FirstPartyURLFormat.FullURL;
        return true;
      }
    }

    this.firstPartyURLFormat = null;
    return false;
  }

  private searchWithFilters = restartableTask(async () => {
    const handleAsExternalLink = () => {
      this.queryType = RelatedResourceQueryType.ExternalLink;
      this.handleQuery();
    };

    // Short links are formatted like [shortLinkBaseURL]/[docType]/[docNumber]

    const urlParts = this.query.split("/");
    const docType = urlParts[urlParts.length - 2];
    const docNumber = urlParts[urlParts.length - 1];

    if (!docType || !docNumber) {
      handleAsExternalLink();
      return;
    }

    // TODO: duplicate resources are being treated like external links

    const filterString = docNumber;
    // TODO: Confirm that this returns accurate results.
    try {
      await this.args.search(this.dd, filterString, true, {
        hitsPerPage: 1,
        optionalFilters: [`docType:"${docType}" AND docNumber:"${docNumber}"`],
      });

      if (this.noMatchesFound) {
        handleAsExternalLink();
      }
    } catch (e: unknown) {
      const typedError = e as { status?: number };

      if (typedError.status) {
        if (typedError.status === 404) {
          handleAsExternalLink();
          return;
        }
      }
      // TODO: confirm that this triggers a `@searchErrorIsShown` update
      throw e;
    }
  });

  private getAlgoliaObject = restartableTask(async (id: string) => {
    assert(
      "full url format expected",
      this.firstPartyURLFormat === FirstPartyURLFormat.FullURL
    );

    this.checkForDuplicate(id, true);

    if (this.linkIsDuplicate) {
      return;
    }

    try {
      await this.args.getObject(this.dd, id);
    } catch (e: unknown) {
      const typedError = e as { status?: number };

      if (typedError.status) {
        if (typedError.status === 404) {
          this.queryType = RelatedResourceQueryType.ExternalLink;
          this.handleQuery();
          return;
        }
      }
      // TODO: confirm that this triggers a `@searchErrorIsShown` update
      throw e;
    }
  });

  /**
   * The task that loads the initial `algoliaResults`.
   * Sends an empty-string query to Algolia, effectively populating its
   * "suggestions." Called when the search input is inserted.
   */
  protected loadInitialData = restartableTask(async () => {
    await this.args.search(this.dd, "", true);
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add": typeof DocumentSidebarRelatedResourcesAddComponent;
  }
}
