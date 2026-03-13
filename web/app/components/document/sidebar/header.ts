import Component from "@glimmer/component";
import type { HermesDocument } from "hermes/types/document";

interface DocumentSidebarHeaderComponentSignature {
  Element: HTMLDivElement;
  Args: {
    document: HermesDocument;
    isCollapsed: boolean;
    toggleCollapsed: () => void;
    userHasScrolled: boolean;
    shareURL: string;
    shareButtonIsShown?: boolean;
    shareButtonIsLoading?: boolean;
    shareButtonTooltipText?: string;
    shareButtonIcon?: string;
  };
}

export default class DocumentSidebarHeaderComponent extends Component<DocumentSidebarHeaderComponentSignature> {
  protected get externalLinkHref(): string {
    const document = this.args.document as HermesDocument & {
      directEditURL?: string;
      webUrl?: string;
    };

    return (
      document.directEditURL ??
      document.webUrl ??
      `https://docs.google.com/document/d/${document.objectID}`
    );
  }

  protected get externalLinkTooltipText(): string {
    const document = this.args.document as HermesDocument & {
      directEditURL?: string;
      webUrl?: string;
    };
    const url = document.directEditURL ?? document.webUrl;

    if (!url) return "Open in Google";

    try {
      const hostname = new URL(url).hostname;
      return hostname.endsWith(".sharepoint.com") || hostname === "sharepoint.com"
        ? "Open in SharePoint"
        : "Open in Google";
    } catch {
      return "Open in Google";
    }
  }

  /**
   * Whether the tooltip is forced open, regardless of hover state.
   * True if the parent component has passed a tooltip text prop,
   * e.g., "Creating link..." or "Link created!"
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
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::Header": typeof DocumentSidebarHeaderComponent;
  }
}
