import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { next, schedule } from "@ember/runloop";
import { assert } from "@ember/debug";
import { dropTask, restartableTask, timeout } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import NativeArray from "@ember/array/-private/native-array";
import { RelatedExternalLink } from ".";
import FlashMessageService from "ember-cli-flash/services/flash-messages";

interface InputsDocumentSelectModalComponentSignature {
  Element: null;
  Args: {
    onClose: () => void;
    addRelatedExternalLink: (link: RelatedExternalLink) => void;
    addRelatedDocument: (documentID: string) => void;
    shownDocuments: Record<string, HermesDocument>;
    objectID?: string;
    relatedDocuments: NativeArray<HermesDocument>;
    relatedLinks: NativeArray<RelatedExternalLink>;
    search: (dd: any, query: string) => Promise<void>;
  };
  Blocks: {
    default: [];
  };
}
const FAKE_TITLES = [
  "Text Input | Helios Design System",
  "Storybook",
  "Zoom | Sign in | The World's Leader in Video Communications",
  "Terraform Labs | Asana",
];

export default class InputsDocumentSelectModalComponent extends Component<InputsDocumentSelectModalComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare flashMessages: FlashMessageService;

  @tracked dd: any = null;
  @tracked query = "";
  @tracked queryIsThirdPartyURL = false;
  @tracked faviconURL: string | null = null;
  @tracked defaultFaviconIsShown = false;

  @tracked searchInput: HTMLInputElement | null = null;
  @tracked faviconHasLoaded = false;
  @tracked editModeIsEnabled = false;
  @tracked externalLinkTitle = FAKE_TITLES[
    Math.floor(Math.random() * 4)
  ] as string;

  get faviconIsShown() {
    return this.faviconHasLoaded && this.fetchURLInfo.isIdle;
  }

  @action private showDuplicateMessage() {
    this.flashMessages.add({
      title: "Duplicate URL",
      message: "This link is already a related doc.",
      type: "critical",
      timeout: 6000,
      extendedTimeout: 1000,
    });
  }

  @action onExternalLinkTitleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.externalLinkTitle = input.value;
  }

  @action addRelatedExternalLink() {
    let externalLink = {
      url: this.query,
      title: this.externalLinkTitle,
    };

    const isDuplicate = this.args.relatedLinks.find((link) => {
      return link.url === externalLink.url;
    });

    if (isDuplicate) {
      this.showDuplicateMessage();
    } else {
      this.args.addRelatedExternalLink(externalLink);
      void this.args.search(null, "");
    }

    this.externalLinkTitle = FAKE_TITLES[
      Math.floor(Math.random() * 4)
    ] as string;

    this.args.onClose();
  }

  @action
  onDocumentKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      console.log('dangit rubber');
      const activeElement = document.activeElement;
      if (activeElement !== this.searchInput) {
        e.stopImmediatePropagation();
        return;
      }
    }
  }

  @action disableEditMode() {
    this.editModeIsEnabled = false;
    this.query = "";
    this.queryIsThirdPartyURL = false;
    schedule("afterRender", () => {
      void this.args.search(this.dd, "");
    });
  }

  @action onInputKeydown(dd: any, e: KeyboardEvent) {
    if (e.key === "Enter") {
      // this probably never fires
      if (this.queryIsThirdPartyURL) {
        this.args.addRelatedExternalLink({
          url: this.query,
          title: this.externalLinkTitle,
        });
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

  protected loadInitialData = dropTask(async (dd: any) => {
    if (this.args.shownDocuments) {
      // if we already have data, don't await it again
      void this.args.search(dd, "");
    } else {
      await this.args.search(dd, "");
      await timeout(200);
    }
  });

  @action protected onInput(dd: any, e: Event) {
    const input = e.target as HTMLInputElement;
    this.query = input.value;

    void this.checkURL.perform();
    void this.args.search(dd, this.query);
    if (this.query === "") {
      this.disableEditMode();
    }
  }

  @action maybeOpenDropdown(dd: any) {
    if (!dd.contentIsShown) {
      dd.showContent();
    }
  }

  protected fetchURLInfo = restartableTask(async () => {
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
        this.faviconHasLoaded = true;
        this.defaultFaviconIsShown = true;
      });

      favicon.src = this.faviconURL as string;
      await timeout(750);
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
    "Inputs::DocumentSelect::Modal": typeof InputsDocumentSelectModalComponent;
  }
}
