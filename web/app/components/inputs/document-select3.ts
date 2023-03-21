import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import { HermesDocument } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import { restartableTask, timeout } from "ember-concurrency";
import NativeArray from "@ember/array/-private/native-array";
import ConfigService from "hermes/services/config";
import FlashMessageService from "ember-cli-flash/services/flash-messages";

interface InputsDocumentSelect3ComponentSignature {
  Args: {
    productArea?: string;
  };
}

interface RelatedExternalLink {
  url: string;
  displayURL: string;
}

// const GOOGLE_FAVICON_URL_PREFIX =
//   "https://s2.googleusercontent.com/s2/favicons";

export default class InputsDocumentSelect3Component extends Component<InputsDocumentSelect3ComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare flashMessages: FlashMessageService;

  @tracked relatedLinks: NativeArray<RelatedExternalLink> = A();
  @tracked relatedDocuments: NativeArray<HermesDocument> = A();

  get relatedResources(): NativeArray<RelatedExternalLink | HermesDocument> {
    let resources: NativeArray<RelatedExternalLink | HermesDocument> = A();
    resources.pushObjects(this.relatedDocuments);
    resources.pushObjects(this.relatedLinks);
    return resources;
  }

  @tracked query = "";

  @tracked inputValueIsValid = false;
  @tracked popoverIsShown = false;

  @tracked faviconURL: string | null = null;

  @tracked popoverTrigger: HTMLElement | null = null;

  @tracked shownDocuments: HermesDocument[] | null = null;

  @tracked searchInput: HTMLInputElement | null = null;

  @action addRelatedExternalLink() {
    let displayURL;

    if (this.query.startsWith("http://")) {
      displayURL = this.query.replace("http://", "");
    } else if (this.query.startsWith("https://")) {
      displayURL = this.query.replace("https://", "");
    } else {
      displayURL = this.query;
    }

    if (displayURL.startsWith("www.")) {
      displayURL = displayURL.replace("www.", "");
    }

    if (displayURL.endsWith("/")) {
      displayURL = displayURL.slice(0, -1);
    }

    let externalLink = {
      url: this.query,
      displayURL: displayURL,
    };

    if (this.relatedLinks.includes(externalLink)) {
      this.showDuplicateMessage();
    } else {
      this.relatedLinks.unshiftObject(externalLink);
    }
    this.hidePopover();
  }

  @action addRelatedDocument(document: HermesDocument) {
    this.relatedDocuments.unshiftObject(document);
    this.hidePopover();

    // Effectively refresh the search results
    void this.search.perform("");
  }

  @action showDuplicateMessage() {
    this.flashMessages.add({
      title: "Duplicate URL",
      message: "This link is already a related doc.",
      type: "critical",
      timeout: 6000,
      extendedTimeout: 1000,
    });
  }

  @action togglePopover() {
    this.popoverIsShown = !this.popoverIsShown;
  }

  @action hidePopover() {
    this.popoverIsShown = false;
    this.clearSearch();
  }

  @action registerPopoverTrigger(e: HTMLElement) {
    this.popoverTrigger = e;
  }

  @action registerAndFocusSearchInput(e: HTMLInputElement) {
    this.searchInput = e;
    this.searchInput.focus();
    void this.search.perform("");
  }

  @action onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.addRelatedExternalLink();
    }

    if (event.key === "Escape") {
      this.clearSearch();
    }
  }

  @action clearSearch() {
    this.query = "";
    this.inputValueIsValid = false;
  }

  @action removeResource(resource: RelatedExternalLink | HermesDocument) {
    // if the resource is a RelatedExternalLink, remove it from the relatedLinks array
    // otherwise, remove it from the relatedDocuments array

    if ("displayURL" in resource) {
      this.relatedLinks.removeObject(resource);
      return;
    } else {
      this.relatedDocuments.removeObject(resource);
      // Effectively refresh the search results
      void this.search.perform("");
      return;
    }
  }

  protected fetchURLInfo = restartableTask(async () => {
    // let infoURL = GOOGLE_FAVICON_URL_PREFIX + "?url=" + this.query;
    // const urlToFetch = this.inputValue;
    // const urlToFetch = infoURL;

    try {
      // Simulate a request
      await timeout(300);
      // const response = await this.fetchSvc.fetch(urlToFetch, {
      //   // For when we make a real request:
      //   // headers: {
      //   //   Authorization:
      //   //     "Bearer " + this.session.data.authenticated.access_token,
      //   //   "Content-Type": "application/json",
      //   // },
      // });

      this.faviconURL =
        "https://www.google.com/s2/favicons?domain=" + this.query;
    } catch (e) {
      console.error(e);
    }
  });

  protected search = restartableTask(async (query: string) => {
    let index =
      this.configSvc.config.algolia_docs_index_name +
      "_createdTime_desc__productRanked";

    // TODO: this search needs to filter out already-selected relatedDocs
    let relatedDocIDs = this.relatedDocuments.map((doc) => doc.objectID);
    let filterString =
      '(NOT objectID:"' + relatedDocIDs.join('" AND NOT objectID:"') + '")';

    if (!this.relatedDocuments.length) {
      filterString = "";
    }
    console.log(filterString);

    try {
      let algoliaResponse = await this.algolia.searchIndex
        .perform(index, query, {
          hitsPerPage: 5,
          filters: filterString,
          attributesToRetrieve: ["title", "product", "docNumber"],
          // give extra ranking to docs in the same product area
          optionalFilters: ["product:" + this.args.productArea],
        })
        .then((response) => response);

      if (algoliaResponse) {
        this.shownDocuments = algoliaResponse.hits as HermesDocument[];
      }
    } catch (e) {
      console.error(e);
    }
  });

  protected onInput = restartableTask(async (inputEvent: InputEvent) => {
    const input = inputEvent.target as HTMLInputElement;
    this.query = input.value;

    void this.checkURL.perform();
    void this.search.perform(this.query);
  });

  protected checkURL = restartableTask(async () => {
    const url = this.query;
    try {
      this.inputValueIsValid = Boolean(new URL(url));
    } catch (e) {
      this.inputValueIsValid = false;
    } finally {
      if (this.inputValueIsValid) {
        this.fetchURLInfo.perform();
      }
    }
  });
}
