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
