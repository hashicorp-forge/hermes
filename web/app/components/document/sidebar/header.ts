import Component from "@glimmer/component";
import ConfigService from "hermes/services/config";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";

interface DocumentSidebarHeaderComponentSignature {
  Args: {
    document: HermesDocument;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
    userHasScrolled: boolean;
  };
}

export function isValidURL(input: string) {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

export default class DocumentSidebarHeaderComponent extends Component<DocumentSidebarHeaderComponentSignature> {
  @service("config") declare configSvc: ConfigService;

  protected get shareButtonIsShown() {
    let { document } = this.args;
    return !document.isDraft && document.docNumber && document.docType;
  }

  protected get url() {
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
