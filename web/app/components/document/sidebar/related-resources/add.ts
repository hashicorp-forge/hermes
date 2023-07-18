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
      shouldIgnoreDelay?: boolean
    ) => Promise<void>;
    findObject: (
      dd: XDropdownListAnchorAPI,
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

export default class DocumentSidebarRelatedResourcesAddComponent extends Component<DocumentSidebarRelatedResourcesAddComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flashMessages: FlashMessageService;

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
   * TODO
   */
  @tracked protected queryIsExternalURL = false;

  /**
   * TODO
   */
  @tracked protected queryIsFirstPartyLink = false;

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

  private get dd(): XDropdownListAnchorAPI {
    assert("dd expected", this._dd);
    return this._dd;
  }

  /**
   * Whether the list element is displayed.
   * True unless the query is a URL and adding external links is allowed.
   */
  protected get listIsShown(): boolean {
    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsExternalURL;
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

    this.dd.onTriggerKeydown(this.dd.contentIsShown, this.dd.showContent, e);
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
   * The action that runs when the search-input value changes.
   * Updates the local query property, checks if it's a URL, and searches Algolia.
   */
  @action protected onInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.query = input.value;
    this.queryIsFirstPartyLink = false;

    this.checkURL();
    void this.args.search(this.dd, this.query);
  }

  @action checkIfFirstPartyLink(url: string) {
    // need to check the URL to see if it's a first party link
    // if it is, we'll query the database to see if it exists.
    // if it does, we'll add it to the related resources
    // in the correct format.

    // need to check if it starts with a the config's shortlink...
    // if so, need to reverse-engineer its ID

    // need to check if the domain matches the current domain
    // and ends with /documents/...

    const isShortLink = url.startsWith(
      this.configSvc.config.short_link_base_url
    );

    const hermesDomain = window.location.hostname.split(".").pop();

    if (hermesDomain) {
      const urlIsFromCurrentDomain = url.includes(hermesDomain);

      if (isShortLink) {
        // Short links are formatted like [shortLinkBaseURL]/[docType]/[docNumber]
        const urlParts = url.split("/");
        const docType = urlParts[urlParts.length - 2];
        const docNumber = urlParts[urlParts.length - 1];
        void this.args.search(
          this.dd,
          `docType:${docType} AND docNumber:${docNumber}`
        );
        // need to set the docType and the docNumber
        return;
      }

      if (urlIsFromCurrentDomain) {
        const docID = url.split("/document/").pop();
        if (docID) {
          void this.args.findObject(this.dd, docID);
          return;
        }
      }
    }
    this.queryIsExternalURL = true;
  }

  /**
   * The action to check if a URL is valid, and, if so,
   * whether it's a duplicate.
   */
  @action private checkURL() {
    this.queryIsURL = isValidURL(this.query);
    if (this.queryIsURL) {
      this.checkForDuplicate(this.query);
      this.checkIfFirstPartyLink(this.query);
    }
  }

  private fetchFirstPartyDocument = restartableTask(
    async (idOrAttributes: string | Record<string, any>) => {
      this.queryIsExternalURL = false;

      if (typeof idOrAttributes === "string") {
        // fetch the document by id
        try {
          let document = await this.args.findObject(this.dd, idOrAttributes);
          if (document) {
            this.queryIsFirstPartyLink = true;
            console.log('uh');
            const relatedHermesDocument = {
              googleFileID: document.objectID,
              title: document.title,
              type: document.docType,
              documentNumber: document.docNumber,
              sortOrder: 1,
            } as RelatedHermesDocument;

            this.dd.hideContent();
            return;
          }
        } catch {
          console.log("aughts");
          this.queryIsFirstPartyLink = false;
          this.queryIsExternalURL = true;
          return;
        }
      } else {
        // search for the document by attributes (docType, docNumber)
      }

      this.queryIsFirstPartyLink = false;
    }
  );

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
