import Component from "@glimmer/component";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import isValidURL from "hermes/utils/is-valid-u-r-l";

interface DocumentSidebarHeaderComponentSignature {
  Args: {
    document: HermesDocument;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
    userHasScrolled: boolean;
    shareButtonIsShown?: boolean;
    shareButtonIsLoading?: boolean;
    shareButtonTooltipText?: string;
    shareButtonIcon?: string;
  };
}

export default class DocumentSidebarHeaderComponent extends Component<DocumentSidebarHeaderComponentSignature> {
  @service("config") declare configSvc: ConfigService;

  /**
   * Whether the tooltip is forced open, regardless of hover state.
   * True if the parent component has passed a tooltip text prop,
   * e.g., "Creating link..." or "Link created."
   */
  get tooltipIsForcedOpen() {
    if (this.args.shareButtonTooltipText) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * If the share button is shown. If the parent component sets this true,
   * it will override the default behavior, which is to show the share button
   * if the document is published and has a docType and docNumber.
   */
  protected get shareButtonIsShown() {
    if (this.args.shareButtonIsShown) {
      return this.args.shareButtonIsShown;
    }

    let { document } = this.args;
    return !document.isDraft && document.docNumber && document.docType;
  }

  /**
   * The URL that the copyURLButton should copy to the clipboard.
   * If the document is a draft, this is the current window location.
   * If the doc is published, use the short link if it's available,
   * otherwise use the current window location.s
   */
  protected get url() {
    // We only assign shortLinks to published documents
    if (this.args.document.isDraft) {
      return window.location.href;
    }

    let shortLinkBaseURL: string | undefined =
      this.configSvc.config.short_link_base_url;

    if (shortLinkBaseURL) {
      // Add a trailing slash if the URL needs one
      if (!shortLinkBaseURL.endsWith("/")) {
        shortLinkBaseURL += "/";
      }
      // Reject invalid URLs
      if (!isValidURL(shortLinkBaseURL)) {
        shortLinkBaseURL = undefined;
      }
    }

    return shortLinkBaseURL
      ? `${
          shortLinkBaseURL + this.args.document.docType.toLowerCase()
        }/${this.args.document.docNumber.toLowerCase()}`
      : window.location.href;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::Header": typeof DocumentSidebarHeaderComponent;
  }
}
