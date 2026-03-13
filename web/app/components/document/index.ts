import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import type { HermesDocument } from "hermes/types/document";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import type { HermesDocumentType } from "hermes/types/document-type";
import type AuthenticatedUserService from "hermes/services/authenticated-user";

interface DocumentIndexComponentSignature {
  Args: {
    document: HermesDocument;
    modelIsChanging: boolean;
    docType: Promise<HermesDocumentType>;
    viewerIsGroupApprover: boolean;
  };
}

export default class DocumentIndexComponent extends Component<DocumentIndexComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @tracked sidebarIsCollapsed = false;

  @action protected toggleSidebarCollapsedState() {
    this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
  }

  /**
   * Check if the document is from SharePoint (has FileID or webUrl contains sharepoint.com)
   */
  get isSharePointDocument(): boolean {
    const doc = this.args.document as any;
    if ("FileID" in doc && doc.FileID) {
      return true;
    }
    if ("webUrl" in doc && doc.webUrl) {
      try {
        const url = new URL(doc.webUrl);
        return url.hostname.endsWith('.sharepoint.com') || url.hostname === 'sharepoint.com';
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Get the current webUrl for the document
   */
  get webUrl(): string {
    const doc = this.args.document as any;
    return ("webUrl" in doc && doc.webUrl) ? doc.webUrl : '';
  }

  /**
   * Get the direct SharePoint URL for opening the document directly in SharePoint
   * This returns the directEditURL if available, or falls back to webUrl
   */
  get sharepointDirectUrl(): string {
    const doc = this.args.document as any;

    // Check for directEditURL first (note the uppercase URL - matches the backend naming)
    if ("directEditURL" in doc && doc.directEditURL) {
      return doc.directEditURL;
    }

    // Fall back to webUrl if directEditURL is not available
    return ("webUrl" in doc && doc.webUrl) ? doc.webUrl : '';
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Document: typeof DocumentIndexComponent;
  }
}
