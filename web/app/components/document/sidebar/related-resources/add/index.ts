import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { next } from "@ember/runloop";
import { assert } from "@ember/debug";
import { dropTask, restartableTask, timeout } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import NativeArray from "@ember/array/-private/native-array";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesAddComponentSignature {
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
    allowAddingExternalLinks?: boolean;
    headerTitle: string;
    inputPlaceholder: string;
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

export default class DocumentSidebarRelatedResourcesAddComponent extends Component<DocumentSidebarRelatedResourcesAddComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare flashMessages: FlashMessageService;

  @tracked query = "";
  @tracked queryIsURL = false;
  @tracked faviconURL: string | null = null;
  @tracked defaultFaviconIsShown = false;

  @tracked searchInput: HTMLInputElement | null = null;
  @tracked faviconHasLoaded = false;
  @tracked urlWasProcessed = false;

  @tracked keyboardNavIsEnabled = true;

  // TODO: Replace this
  @tracked externalLinkTitle = FAKE_TITLES[
    Math.floor(Math.random() * 4)
  ] as string;

  get faviconIsShown() {
    return this.faviconHasLoaded && this.fetchURLInfo.isIdle;
  }

  get noMatchesFound(): boolean {
    const objectEntriesLengthIsZero =
      Object.entries(this.args.shownDocuments).length === 0;


    if (this.args.allowAddingExternalLinks) {
      return objectEntriesLengthIsZero && !this.queryIsURL;
    } else {
      return objectEntriesLengthIsZero;
    }
  }

  get listIsShown(): boolean {
    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsURL;
    } else {
      return true;
    }
  }

  get listHeaderIsShown(): boolean {
    if (this.noMatchesFound) {
      return false;
    }

    if (this.args.allowAddingExternalLinks) {
      return !this.queryIsURL && !this.fetchURLInfo.isRunning;
    }

    return true;
  }

  get queryIsEmpty(): boolean {
    return this.query.length === 0;
  }

  protected get noMatchesHeaderIsHidden(): boolean {
    if (this.args.allowAddingExternalLinks) {
      return this.queryIsURL || this.queryIsEmpty;
    } else {
      return false;
    }
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

  @action protected disableKeyboardNav() {
    this.keyboardNavIsEnabled = false;
  }

  @action protected enableKeyboardNav() {
    this.keyboardNavIsEnabled = true;
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

  /**
   * TODO: Explain this
   * TODO: Rename this
   */
  @action protected onDocumentKeydown(e: KeyboardEvent) {
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
      if (this.queryIsURL) {
        this.addRelatedExternalLink();
        this.args.onClose();
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

  @action didInsertInput(dd: any, e: HTMLInputElement) {
    this.searchInput = e;
    void this.loadInitialData.perform(dd);

    next(() => {
      assert("searchInput expected", this.searchInput);
      this.searchInput.focus();
    });
  }

  protected loadInitialData = dropTask(async (dd: any) => {
    await this.args.search(dd, "");
  });

  @action protected onInput(dd: any, e: Event) {
    const input = e.target as HTMLInputElement;
    this.query = input.value;
    void this.checkURL.perform();
    void this.args.search(dd, this.query);
  }

  @action maybeOpenDropdown(dd: any) {
    if (!dd.contentIsShown) {
      dd.showContent();
    }
  }

  protected fetchURLInfo = restartableTask(async () => {
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
      await timeout(1500);
      this.urlWasProcessed = true;

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
      this.queryIsURL = Boolean(new URL(url));
    } catch (e) {
      this.queryIsURL = false;
    } finally {
      if (this.queryIsURL) {
        void this.fetchURLInfo.perform();
      }
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add": typeof DocumentSidebarRelatedResourcesAddComponent;
  }
}
