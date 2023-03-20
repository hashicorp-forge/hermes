import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import { HermesDocument } from "hermes/types/document";

import { restartableTask } from "ember-concurrency";
import SessionService from "hermes/services/session";
import FetchService from "hermes/services/fetch";
import { assert } from "@ember/debug";
import { Response, createServer } from "miragejs";
import config from "hermes/config/environment";

interface InputsDocumentSelect2ComponentSignature {
  Args: {};
}

const GOOGLE_FAVICON_URL_PREFIX =
  "https://s2.googleusercontent.com/s2/favicons";

createServer({
  routes() {
    this.get(GOOGLE_FAVICON_URL_PREFIX, (schema, request) => {
      // let url = request.queryParams["url"];

      // need to respond
      return new Response(200, {}, "");
    });

    this.passthrough();
    this.passthrough(`https://${config.algolia.appID}-dsn.algolia.net/**`);
  },
});

export default class InputsDocumentSelect2Component extends Component<InputsDocumentSelect2ComponentSignature> {
  @service declare algolia: AlgoliaService;
  @service declare session: SessionService;
  @service("fetch") declare fetchSvc: FetchService;

  @tracked relatedResources = A();

  @tracked inputValue = "";
  @tracked query = "";

  @tracked inputValueIsValid = false;
  @tracked popoverIsShown = false;
  @tracked popoverTrigger: HTMLElement | null = null;
  @tracked shownDocuments: HermesDocument[] | null = null;

  @tracked searchInput: HTMLInputElement | null = null;

  @tracked faviconURL: string | null = null;

  get userHasSearched() {
    return this.query.length > 0;
  }

  get searchButtonIsShown() {
    return this.inputValue.length === 0;
  }

  @action maybeAddResource() {
    if (!this.inputValueIsValid) {
      alert("invalid url");
    } else {
      // if the object doesn't exist, add it
      if (!this.relatedResources.includes(this.inputValue)) {
        this.relatedResources.pushObject(this.inputValue);
        this.clearSearch();
        this.popoverIsShown = false;
        this.faviconURL = null;
      } else {
        alert("already exists");
      }
    }
  }

  @action removeResource(resource: string) {
    this.relatedResources.removeObject(resource);
  }

  @action togglePopover() {
    this.popoverIsShown = !this.popoverIsShown;
  }

  @action hidePopover() {
    this.popoverIsShown = false;
  }

  @action onInputFocusin(e: FocusEvent) {
    const input = e.target as HTMLInputElement;
    input.placeholder = "";

    this.popoverIsShown = true;
  }

  @action registerPopoverTrigger(e: HTMLElement) {
    this.popoverTrigger = e;
  }

  @action onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.maybeAddResource();
    }

    if (event.key === "Escape") {
      this.clearSearch();
    }
  }

  @action onInput(event: Event) {
    this.inputValue = (event.target as HTMLInputElement).value;
    this.checkURL.perform();
  }

  @action clearSearch() {
    this.inputValue = "";
    this.query = "";
    this.inputValueIsValid = false;
  }

  protected fetchURLInfo = restartableTask(async () => {
    let infoURL = GOOGLE_FAVICON_URL_PREFIX + "?url=" + this.inputValue;

    // const urlToFetch = this.inputValue;
    const urlToFetch = infoURL;

    try {
      const response = await this.fetchSvc.fetch(urlToFetch, {
        // For when we make a real request:
        // headers: {
        //   Authorization:
        //     "Bearer " + this.session.data.authenticated.access_token,
        //   "Content-Type": "application/json",
        // },
      });

      if (response?.ok) {
        this.faviconURL =
          "https://www.google.com/s2/favicons?domain=" + this.inputValue;
      }

      if (response?.status === 404) {
        this.faviconURL = null;
      }
    } catch (e) {
      console.error(e);
    }
  });

  protected search = restartableTask(async (inputEvent: InputEvent) => {
    const input = inputEvent.target as HTMLInputElement;
    this.query = input.value;

    if (this.query === "") {
      this.shownDocuments = null;
      return;
    } else {
      this.popoverIsShown = true;
    }

    let algoliaResponse = await this.algolia.search.perform(this.query, {
      hitsPerPage: 5,
      attributesToRetrieve: ["title", "product", "docNumber"],
      // give extra ranking to docs in the same product area
      // optionalFilters: ["product:" + this.args.productArea],
    });

    if (algoliaResponse) {
      this.shownDocuments = algoliaResponse.hits as HermesDocument[];
    }
  });

  protected checkURL = restartableTask(async () => {
    const url = this.inputValue;
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
