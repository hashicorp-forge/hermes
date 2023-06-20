import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import { HermesDocument } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import { dropTask, restartableTask, timeout } from "ember-concurrency";
import NativeArray from "@ember/array/-private/native-array";
import ConfigService from "hermes/services/config";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { next, schedule } from "@ember/runloop";
import { assert } from "@ember/debug";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import move from "ember-animated/motions/move";
import { TransitionContext, wait } from "ember-animated/.";
import { EmberAnimatedTransition } from "ember-animated/transition";

interface InputsDocumentSelectComponentSignature {
  Args: {
    productArea?: string;
    objectID?: string;
  };
}

export interface RelatedExternalLink {
  url: string;
  displayURL: string;
  title: string;
}

const FAKE_TITLES = [
  "Text Input | Helios Design System",
  "Storybook",
  "Zoom | Sign in | The World's Leader in Video Communications",
  "Terraform Labs | Asana",
];

// const GOOGLE_FAVICON_URL_PREFIX =
//   "https://s2.googleusercontent.com/s2/favicons";

export default class InputsDocumentSelectComponent extends Component<InputsDocumentSelectComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare flashMessages: FlashMessageService;

  @tracked query = "";
  @tracked queryIsThirdPartyURL = false;
  @tracked relatedLinks: NativeArray<RelatedExternalLink> = A();
  @tracked relatedDocuments: NativeArray<HermesDocument> = A();
  @tracked faviconURL: string | null = null;
  @tracked _shownDocuments: HermesDocument[] | null = null;
  @tracked searchInput: HTMLInputElement | null = null;

  @tracked displayURL = "";

  @tracked modalIsShown = false;
  @tracked faviconHasLoaded = false;
  @tracked defaultFaviconIsShown = false;
  @tracked editModeIsEnabled = false;

  @tracked externalLinkTitle = FAKE_TITLES[
    Math.floor(Math.random() * 4)
  ] as string;

  @tracked dd: any = null;

  get faviconIsShown() {
    return this.faviconHasLoaded && this.fetchURLInfo.isIdle;
  }

  get relatedResourcesAreShown(): boolean {
    return Object.keys(this.relatedResources).length > 0;
  }

  *linkCardTransition({ insertedSprites, removedSprites }: TransitionContext) {
    for (let sprite of insertedSprites) {
      void fadeIn(sprite, { duration: 100 });
    }
  }

  *transition({
    insertedSprites,
    keptSprites,
    removedSprites,
  }: TransitionContext) {
    for (let sprite of insertedSprites) {
      sprite.applyStyles({
        opacity: "0",
      });
      sprite.startTranslatedBy(0, -3);
      void fadeIn(sprite, { duration: 0 });
      void move(sprite, { duration: 150 });
    }

    for (let sprite of keptSprites) {
      void move(sprite, { duration: 150 });
    }
    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: 0 });
    }
  }

  get relatedResourcesObjectEntries() {
    const objectEntries = Object.entries(this.relatedResources);

    // we only need the attributes, not the keys
    return objectEntries.map((entry) => {
      return entry[1];
    });
  }

  get relatedResources(): {
    [key: string]: RelatedExternalLink | HermesDocument;
  } {
    let resourcesArray: NativeArray<RelatedExternalLink | HermesDocument> = A();
    resourcesArray.pushObjects(this.relatedDocuments);
    resourcesArray.pushObjects(this.relatedLinks);

    let resourcesObject: {
      [key: string]: RelatedExternalLink | HermesDocument;
    } = {};

    resourcesArray.forEach((resource: RelatedExternalLink | HermesDocument) => {
      let key = "";

      if ("url" in resource) {
        key = resource.url;
      } else if ("objectID" in resource) {
        key = resource.objectID;
      }
      resourcesObject[key] = resource;
    });

    return resourcesObject;
  }

  get shownDocuments(): { [key: string]: HermesDocument } {
    /**
     * The array initially looks like this:
     * [{title: "foo", objectID: "bar"...}, ...]
     *
     * We need it to look like:
     * { "bar": {title: "foo", objectID: "bar"...}, ...}
     */

    let documents: any = {};

    if (this._shownDocuments) {
      this._shownDocuments.forEach((doc) => {
        documents[doc.objectID] = doc;
      });
    }
    return documents;
  }

  @action showModal() {
    this.modalIsShown = true;
  }

  @action hideModal() {
    this.modalIsShown = false;
    this.query = "";
    this.queryIsThirdPartyURL = false;
    this.editModeIsEnabled = false;

    // This updates the suggestions for the next time the modal is opened
    void this.search.perform(null, "");
  }

  @action prepareRelatedExternalLink() {
    let displayURL = "";

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

    displayURL = displayURL.split("/")[0] as string;

    this.displayURL = displayURL;
  }

  @action onExternalLinkTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.externalLinkTitle = input.value;
  }

  @action addRelatedExternalLink() {
    let externalLink = {
      url: this.query,
      displayURL: this.displayURL,
      title: this.externalLinkTitle,
    };

    const isDuplicate = this.relatedLinks.find((link) => {
      return link.url === externalLink.url;
    });

    if (isDuplicate) {
      this.showDuplicateMessage();
    } else {
      this.relatedLinks.unshiftObject(externalLink);
      void this.search.perform(null, "");
    }

    this.hideModal();

    this.externalLinkTitle = FAKE_TITLES[
      Math.floor(Math.random() * 4)
    ] as string;

    // TODO: show a success affordance
  }

  @action maybeAddRelatedExternalLink() {
    if (!this.editModeIsEnabled) {
      this.addRelatedExternalLink();
    }
  }

  @action addRelatedDocument(documentObjectID: string) {
    let document = this.shownDocuments[documentObjectID];
    if (document) {
      this.relatedDocuments.unshiftObject(document);
    }
    this.hideModal();
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

  @action onDocumentKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      const activeElement = document.activeElement;
      if (activeElement !== this.searchInput) {
        e.stopImmediatePropagation();
        return;
      }
    }
  }

  @action onInputKeydown(dd: any, e: KeyboardEvent) {
    if (e.key === "Enter") {
      // this probably never fires
      if (this.queryIsThirdPartyURL) {
        this.addRelatedExternalLink();
        dd.hideContent();
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

  @action didInsertInput(dd: any, e: HTMLInputElement) {
    this.dd = dd;
    this.searchInput = e;
    void this.loadInitialData.perform(dd);

    next(() => {
      assert("searchInput expected", this.searchInput);
      this.searchInput.focus();
    });
  }

  @action maybeCloseDropdown(dd: any) {
    if (dd.contentIsShown) {
      dd.hideContent();
    }
  }

  @action maybeOpenDropdown(dd: any) {
    if (!dd.contentIsShown) {
      dd.showContent();
    }
  }

  @action disableEditMode() {
    this.editModeIsEnabled = false;
    this.query = "";
    this.queryIsThirdPartyURL = false;
    schedule("afterRender", () => {
      void this.search.perform(this.dd, "");
    });
  }

  @action removeResource(resource: RelatedExternalLink | HermesDocument) {
    // if the resource is a RelatedExternalLink, remove it from the relatedLinks array
    // otherwise, remove it from the relatedDocuments array

    if ("displayURL" in resource) {
      this.relatedLinks.removeObject(resource);
      return;
    } else {
      this.relatedDocuments.removeObject(resource);
      return;
    }
  }

  protected loadInitialData = dropTask(async (dd: any) => {
    if (this._shownDocuments) {
      // if we already have data, don't await it again
      void this.search.perform(dd, "");
    } else {
      await this.search.perform(dd, "");
      await timeout(200);
    }
  });

  protected search = restartableTask(async (dd: any, query: string) => {
    let index =
      this.configSvc.config.algolia_docs_index_name +
      "_createdTime_desc__productRanked";

    let filterString = `(NOT objectID:"${this.args.objectID}")`;

    if (this.relatedDocuments.length) {
      let relatedDocIDs = this.relatedDocuments.map((doc) => doc.objectID);

      filterString = filterString.slice(0, -1) + " ";

      filterString += `AND NOT objectID:"${relatedDocIDs.join(
        '" AND NOT objectID:"'
      )}")`;
    }

    try {
      let algoliaResponse = await this.algolia.searchIndex
        .perform(index, query, {
          hitsPerPage: 4,
          filters: filterString,
          attributesToRetrieve: [
            "title",
            "product",
            "docNumber",
            "docType",
            "status",
            "owners",
          ],
          optionalFilters: ["product:" + this.args.productArea],
        })
        .then((response) => response);
      if (algoliaResponse) {
        this._shownDocuments = algoliaResponse.hits as HermesDocument[];
        if (dd) {
          dd.resetFocusedItemIndex();
        }
      }
      if (dd) {
        next(() => {
          dd.scheduleAssignMenuItemIDs();
        });
      }
    } catch (e) {
      console.error(e);
    }
  });

  @action protected onInput(dd: any, e: Event) {
    const input = e.target as HTMLInputElement;
    this.query = input.value;

    void this.checkURL.perform();
    void this.search.perform(dd, this.query);
    if (this.query === "") {
      this.disableEditMode();
    }
  }

  protected fetchURLInfo = restartableTask(async () => {
    this.prepareRelatedExternalLink();
    // let infoURL = GOOGLE_FAVICON_URL_PREFIX + "?url=" + this.query;
    // const urlToFetch = this.inputValue;
    // const urlToFetch = infoURL;
    this.faviconHasLoaded = false;

    try {
      this.faviconURL =
        "https://www.google.com/s2/favicons?domain=" + this.query;

      // Simulate a request
      const favicon = new Image();

      favicon.addEventListener("load", () => {
        this.faviconHasLoaded = true;
      });

      favicon.addEventListener("error", () => {
        console.log("error");
        this.faviconHasLoaded = true;
        this.defaultFaviconIsShown = true;
      });

      favicon.src = this.faviconURL as string;
      await timeout(1000);
      this.editModeIsEnabled = true;

      // const response = await this.fetchSvc.fetch(urlToFetch, {
      //   // For when we make a real request:
      //   // headers: {
      //   //   Authorization:
      //   //     "Bearer " + this.session.data.authenticated.access_token,
      //   //   "Content-Type": "application/json",
      //   // },
      // });
    } catch (e) {
      console.error(e);
    }
  });

  protected checkURL = restartableTask(async () => {
    const url = this.query;
    try {
      this.queryIsThirdPartyURL = Boolean(new URL(url));
    } catch (e) {
      this.queryIsThirdPartyURL = false;
    } finally {
      if (this.queryIsThirdPartyURL) {
        void this.fetchURLInfo.perform();
      }
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect": typeof InputsDocumentSelectComponent;
  }
}
