import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { next } from "@ember/runloop";
import { assert } from "@ember/debug";
import { dropTask } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/document/sidebar/related-resources";
import isValidURL from "hermes/utils/is-valid-u-r-l";

interface DocumentSidebarRelatedResourcesAddComponentSignature {
  Element: null;
  Args: {
    onClose: () => void;
    addRelatedExternalLink: (link: RelatedExternalLink) => void;
    addRelatedDocument: (documentID: string) => void;
    shownDocuments: Record<string, HermesDocument>;
    objectID?: string;
    relatedDocuments: RelatedHermesDocument[];
    relatedLinks: RelatedExternalLink[];
    search: (dd: any, query: string) => Promise<void>;
    allowAddingExternalLinks?: boolean;
    headerTitle: string;
    inputPlaceholder: string;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesAddComponent extends Component<DocumentSidebarRelatedResourcesAddComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare flashMessages: FlashMessageService;

  @tracked query = "";
  @tracked queryIsURL = false;

  @tracked searchInput: HTMLInputElement | null = null;
  @tracked urlWasProcessed = false;

  @tracked keyboardNavIsEnabled = true;

  @tracked externalLinkTitle = "";
  @tracked linkIsDuplicate = false;

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
      return !this.queryIsURL;
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

  @action checkForDuplicate(url: string) {
    const isDuplicate = this.args.relatedLinks.find((link) => {
      return link.url === url;
    });

    if (isDuplicate) {
      this.linkIsDuplicate = true;
    } else {
      this.linkIsDuplicate = false;
    }
  }

  @action addRelatedExternalLink() {
    let externalLink = {
      url: this.query,
      name: this.externalLinkTitle || this.query,
      sortOrder: 1,
    };

    this.checkForDuplicate(externalLink.url);

    if (!this.linkIsDuplicate) {
      this.args.addRelatedExternalLink(externalLink);
      void this.args.search(null, "");
      this.externalLinkTitle = "";
      this.args.onClose();
    }
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
    this.checkURL();
    void this.args.search(dd, this.query);
  }

  @action maybeOpenDropdown(dd: any) {
    if (!dd.contentIsShown) {
      dd.showContent();
    }
  }

  @action checkURL() {
    this.queryIsURL = isValidURL(this.query);
    if (this.queryIsURL) {
      this.urlWasProcessed = true;
      this.checkForDuplicate(this.query);
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add": typeof DocumentSidebarRelatedResourcesAddComponent;
  }
}
