import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import { restartableTask } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import { service } from "@ember/service";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
} from "hermes/components/related-resources";
import isValidURL from "hermes/utils/is-valid-u-r-l";
import FetchService from "hermes/services/fetch";
import { XDropdownListAnchorAPI } from "hermes/components/x/dropdown-list";
import { SearchOptions } from "hermes/services/search";
import { RelatedResourcesScope } from "../related-resources";
import { guidFor } from "@ember/object/internals";
import HermesFlashMessagesService from "hermes/services/flash-messages";

interface RelatedResourcesAddComponentSignature {
  Element: null;
  Args: {
    onClose: () => void;
    addResource: (resource: RelatedResource) => void;
    algoliaResults: Record<string, HermesDocument>;
    objectID?: string;
    relatedDocuments: RelatedHermesDocument[];
    relatedLinks: RelatedExternalLink[];
    search: (
      dd: XDropdownListAnchorAPI | null,
      query: string,
      shouldIgnoreDelay?: boolean,
      options?: SearchOptions,
    ) => Promise<void>;
    getObject: (dd: XDropdownListAnchorAPI | null, id: string) => Promise<void>;
    headerTitle: string;
    inputPlaceholder: string;
    searchErrorIsShown?: boolean;
    searchIsRunning?: boolean;
    resetAlgoliaResults: () => void;
    scope?: `${RelatedResourcesScope}`;
  };
  Blocks: {
    default: [];
  };
}

enum RelatedResourceQueryType {
  /**
   * The default query type. Used for document searches.
   */
  AlgoliaSearch = "algoliaSearch",

  /**
   * Used for shortLink URLs. Searches Algolia with filters
   * as parsed by its docType and docNumber.
   */
  AlgoliaSearchWithFilters = "algoliaSearchWithFilters",

  /**
   * Used for full Hermes URLs. Used to query Algolia by :document_id.
   */
  AlgoliaGetObject = "algoliaGetObject",

  /**
   * Used for external, URLs and Hermes searches that return no results.
   */
  ExternalLink = "externalLink",
}

enum FirstPartyURLFormat {
  ShortLink = "shortLink",
  FullURL = "fullURL",
}

export default class RelatedResourcesAddComponent extends Component<RelatedResourcesAddComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flashMessages: HermesFlashMessagesService;

  private scopeIsExternalLinks =
    this.args.scope === RelatedResourcesScope.ExternalLinks;

  protected id = guidFor(this);
  protected externalLinkFormBodyID = `${this.id}-body`;
  protected externalLinkFormSubmitID = `${this.id}-submit`;
  protected externalLinkFormBodySelector = `#${this.externalLinkFormBodyID}`;
  protected externalLinkFormSubmitSelector = `#${this.externalLinkFormSubmitID}`;

  /**
   * The query type, determined onInput. Dictates how the query is handled.
   */
  @tracked queryType = RelatedResourceQueryType.AlgoliaSearch;

  /**
   * The format of the first-party URL, if the query is one.
   * Used to determine how to handle the query: Short links are treated
   * as a search with filters, while full URLs are handled as getObject requests.
   */
  @tracked firstPartyURLFormat: FirstPartyURLFormat | null = null;

  /**
   * A local duplicate of the XDropdownListAnchorAPI.
   * Registered when the search input is inserted.
   * Asserted true by its sibling getter.
   */
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
  @tracked protected queryIsURL = this.scopeIsExternalLinks ? true : false;

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
   * The documents shown in the Algolia results list.
   */
  protected get algoliaResults(): Record<string, HermesDocument> {
    if (this.linkIsDuplicate) {
      return {};
    }
    return this.args.algoliaResults;
  }

  private get allowAddingExternalLinks() {
    if (this.args.scope === RelatedResourcesScope.Documents) {
      return false;
    } else {
      return true;
    }
  }
  /**
   * Whether the query is an external URL.
   * Used as a shorthand check when determining layout and behavior.
   */
  protected get queryIsExternalURL() {
    return this.queryType === RelatedResourceQueryType.ExternalLink;
  }

  /**
   * Whether a query has no results.
   * May determine whether the list header (e.g., "suggestions," "results") is shown.
   */
  private get noMatchesFound(): boolean {
    return Object.entries(this.args.algoliaResults).length === 0;
  }

  /**
   * The app's configured shortLinkBaseURL if it exists.
   * Used to determine whether a URL is a first-party shortLink.
   */
  private get shortLinkBaseURL(): string | undefined {
    return this.configSvc.config.short_link_base_url;
  }

  /**
   * An asserted-true reference to the XDropdownListAnchorAPI.
   */
  private get dd(): XDropdownListAnchorAPI {
    assert("dd expected", this._dd);
    return this._dd;
  }

  /**
   * Whether the list element is displayed.
   * True unless the query is a URL and adding external links is allowed.
   */
  protected get listIsShown(): boolean {
    if (this.scopeIsExternalLinks) {
      return false;
    }

    if (this.allowAddingExternalLinks) {
      return !this.queryIsExternalURL;
    } else {
      return true;
    }
  }

  protected get externalResourceFormIsShown() {
    if (this.args.scope === RelatedResourcesScope.ExternalLinks) {
      return true;
    } else {
      return this.allowAddingExternalLinks && this.queryIsExternalURL;
    }
  }

  /**
   * The message to show in the "<:no-matches>" block
   * when the query errors, detects a duplicate, or returns no results.
   */
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
    if (this.scopeIsExternalLinks) {
      return false;
    }

    if (this.noMatchesFound) {
      return false;
    }

    if (this.queryIsFirstPartyURL(this.query)) {
      if (this.queryType === RelatedResourceQueryType.ExternalLink) {
        return false;
      }
      return !this.linkIsDuplicate;
    }
    if (this.allowAddingExternalLinks) {
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
    if (this.allowAddingExternalLinks) {
      return this.queryIsExternalURL || this.queryIsEmpty;
    } else {
      return false;
    }
  }

  protected get searchLoaderIsShown() {
    return this.args.searchIsRunning && !this.loadInitialData.isRunning;
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

  /**
   * The action to run when the external link form is submitted.
   * Validates the title input, then adds the link, if it's not a duplicate.
   */
  @action onExternalLinkSubmit(resource?: RelatedExternalLink) {
    if (!this.scopeIsExternalLinks) {
      // The "externalLinkTitle" property is only used for fallback link.
      if (this.externalLinkTitle.length === 0) {
        this.externalLinkTitleErrorIsShown = true;
        return;
      }
    }

    if (!this.linkIsDuplicate) {
      this.addRelatedExternalLink(resource);
    }
  }

  /**
   * The action passed to the XDropdownList component, to be run when an item is clicked.
   * Adds the clicked document to the related-documents array in the correct format.
   */
  @action protected onItemClick(_item: any, attrs: any) {
    const {
      title,
      owners,
      product,
      status,
      summary,
      createdTime,
      modifiedTime,
    } = attrs;

    const relatedHermesDocument = {
      googleFileID: attrs.objectID,
      documentType: attrs.docType,
      documentNumber: attrs.docNumber,
      title,
      summary,
      owners,
      product,
      status,
      createdTime,
      modifiedTime,
      sortOrder: 1,
    };

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
    resourceIsHermesDocument = false,
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
  @action private addRelatedExternalLink(resource?: RelatedExternalLink) {
    let externalLink = {
      url: resource?.url ?? this.query,
      name: resource?.name ?? (this.externalLinkTitle || this.query),
      sortOrder: resource?.sortOrder ?? 1,
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
   * Saves the input locally and loads initial data.
   */
  @action protected didInsertInput(
    dd: XDropdownListAnchorAPI,
    e: HTMLInputElement,
  ) {
    this.searchInput = e;
    this._dd = dd;
    this.dd.registerAnchor(this.searchInput);
    void this.loadInitialData.perform();
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
        this.addRelatedExternalLink();
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
      if (this.allowAddingExternalLinks) {
        this.queryType = RelatedResourceQueryType.ExternalLink;
        return;
      }
    }

    this.queryType = RelatedResourceQueryType.AlgoliaSearch;
  }

  /**
   * The action run once the query type is determined.
   * Calls the appropriate method for the query.
   */
  @action private handleQuery() {
    switch (this.queryType) {
      case RelatedResourceQueryType.AlgoliaSearch:
        void this.args.search(this.dd, this.query);
        break;
      case RelatedResourceQueryType.AlgoliaGetObject:
        /**
         * First-class queries are either:
         * - Hermes URLs (e.g., /document/:document_id?queryParams)
         * - Google Docs URLs (e.g., /document/d/:document_id/viewMode)
         */
        let docID = this.query.split("/document/").pop();

        if (docID === this.query) {
          // URL splitting didn't work.
          // Re-handle the query as an external link.
          this.queryType = RelatedResourceQueryType.ExternalLink;
          this.handleQuery();
          break;
        }

        if (docID) {
          // Trim any leading "d/"
          if (docID.includes("d/")) {
            docID = docID.replace("d/", "");
          }

          // Trim anything after a slash
          if (docID.includes("/")) {
            docID = docID.split("/")[0] as string;
          }

          // Trim any trailing query params
          if (docID.includes("?")) {
            docID = docID.split("?")[0] as string;
          }

          void this.getAlgoliaObject.perform(docID);
          break;
        } else {
          // The query looked like a full URL, but
          this.queryType = RelatedResourceQueryType.ExternalLink;
          this.handleQuery();
        }
      case RelatedResourceQueryType.AlgoliaSearchWithFilters:
        void this.searchWithFilters.perform();
        break;
      case RelatedResourceQueryType.ExternalLink:
        this.args.resetAlgoliaResults();
        this.checkForDuplicate(this.query);
        break;
    }
  }

  /**
   * An action to check if is a query is a first-party URL.
   * Sets the `firstPartyURLFormat` property depending on its assessment.
   */
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

    const googleDocsURL = "https://docs.google.com/document/d/";

    if (url.includes(googleDocsURL)) {
      this.firstPartyURLFormat = FirstPartyURLFormat.FullURL;
      return true;
    }

    this.firstPartyURLFormat = null;
    return false;
  }

  /**
   * An Algolia search for queries identified as first-party shortLinks.
   * Checks the query for a docType and docNumber, and if they exist,
   * uses them as filters in the Algolia search.
   */
  private searchWithFilters = restartableTask(async () => {
    const handleAsExternalLink = () => {
      this.queryType = RelatedResourceQueryType.ExternalLink;
      this.handleQuery();
    };

    // Short links are formatted like [shortLinkBaseURL]/[docType]/[docNumber]

    const urlParts = this.query.split("/");
    const docType = urlParts[urlParts.length - 2];
    const docNumber = urlParts[urlParts.length - 1];
    const hasTypeAndNumber = docType && docNumber;
    if (this.allowAddingExternalLinks) {
      if (!hasTypeAndNumber) {
        handleAsExternalLink();
        return;
      }
    }

    const filterString = docNumber || this.query;
    const optionalFilters = docNumber
      ? [`docType:"${docType}" AND docNumber:"${docNumber}"`]
      : [];

    // Errors are handled in the parent method
    await this.args.search(this.dd, filterString, true, {
      hitsPerPage: 1,
      optionalFilters,
    });

    // This will update the `shownDocuments` object
    // need to check the value of the first key
    const firstResult = Object.values(this.algoliaResults)[0] as HermesDocument;

    if (this.noMatchesFound) {
      if (this.allowAddingExternalLinks) {
        handleAsExternalLink();
        return;
      }
    }

    this.checkForDuplicate(firstResult?.objectID, true);

    if (this.linkIsDuplicate) {
      return;
    }
  });

  /**
   * An Algolia getObject request for queries identified as first-party full URLs.
   * Fetches non-duplicate docs by ID. If the request fails, the query is handled
   * as an external link.
   */
  private getAlgoliaObject = restartableTask(async (id: string) => {
    assert(
      "full url format expected",
      this.firstPartyURLFormat === FirstPartyURLFormat.FullURL,
    );

    this.checkForDuplicate(id, true);

    if (this.linkIsDuplicate) {
      return;
    }

    try {
      await this.args.getObject(this.dd, id);
    } catch (e: unknown) {
      // The parent method throws when a 404 is returned.
      // We catch it here and reprocess the query as an external link.
      this.queryType = RelatedResourceQueryType.ExternalLink;
      this.handleQuery();
      return;
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
    "RelatedResources::Add": typeof RelatedResourcesAddComponent;
  }
}
