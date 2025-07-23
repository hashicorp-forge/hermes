import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { HermesDocumentType } from "hermes/types/document-type";
import AuthenticatedUserService from "hermes/services/authenticated-user";

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
   * Check if the document is from SharePoint (has sharepointFileID or webUrl contains sharepoint.com)
   */
  get isSharePointDocument(): boolean {
    const doc = this.args.document as any;
    return !!(("sharepointFileID" in doc && doc.sharepointFileID) || 
              ("webUrl" in doc && doc.webUrl && doc.webUrl.includes('sharepoint.com')));
  }

  /**
   * Get the current webUrl for the document
   */
  get webUrl(): string {
    const doc = this.args.document as any;
    return ("webUrl" in doc && doc.webUrl) ? doc.webUrl : '';
  }

  /**
   * Get the document ID (prefer SharePoint ID if available, otherwise use Google ID)
   */
  get docId(): string {
    const doc = this.args.document as any;
    if ("sharepointFileID" in doc && doc.sharepointFileID) {
      return doc.sharepointFileID;
    }
    if ("googleFileID" in doc && doc.googleFileID) {
      return doc.googleFileID;
    }
    return doc.objectID || '';
  }

  /**
   * Generate a direct SharePoint URL for content access
   */
  get sharepointDirectUrl(): string {
    const doc = this.args.document as any;
    if ("sharepointFileID" in doc && doc.sharepointFileID && 
        "webUrl" in doc && doc.webUrl && doc.webUrl.includes('sharepoint.com')) {
      // Extract the base SharePoint domain from webUrl
      try {
        const url = new URL(doc.webUrl);
        const domain = url.hostname;
        // Return a direct content URL that can be used with Office Online
        return `https://${domain}/_api/v2.0/drives/root/items/${doc.sharepointFileID}/content`;
      } catch (e) {
        console.warn('Error parsing SharePoint URL:', e);
        return doc.webUrl;
      }
    }
    return ("webUrl" in doc && doc.webUrl) ? doc.webUrl : '';
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Document: typeof DocumentIndexComponent;
  }
}
