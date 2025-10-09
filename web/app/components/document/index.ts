import Component from "@glimmer/component";
import { service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { HermesDocumentType } from "hermes/types/document-type";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import HermesFlashMessagesService from "hermes/services/flash-messages";

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
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare flashMessages: HermesFlashMessagesService;
  
  @tracked sidebarIsCollapsed = false;
  @tracked documentContent = "";
  @tracked isLoadingContent = false;
  @tracked isSavingContent = false;
  @tracked isEditMode = false;

  /**
   * Get user profile, returning a guest profile if user info is not loaded
   * (e.g., when using Dex authentication without OIDC flow)
   */
  protected get profile() {
    return this.authenticatedUser.info;
  }

  /**
   * Check if we're using local workspace (which supports text editing)
   */
  protected get isLocalWorkspace() {
    return this.configSvc.config.workspace_provider === "local";
  }

  /**
   * Check if we're using Google workspace (which uses iframe)
   */
  protected get isGoogleWorkspace() {
    return this.configSvc.config.workspace_provider === "google";
  }

  @action protected toggleSidebarCollapsedState() {
    this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
  }

  @action protected async loadDocumentContent() {
    if (!this.isLocalWorkspace) return;
    
    this.isLoadingContent = true;
    try {
      const response = await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/documents/${this.args.document.objectID}/content`,
        { method: "GET" }
      );
      const data = await response?.json();
      this.documentContent = data.content || "";
    } catch (error) {
      this.flashMessages.critical("Failed to load document content", {
        title: "Error",
      });
      console.error("Error loading document content:", error);
    } finally {
      this.isLoadingContent = false;
    }
  }

  @action protected async saveDocumentContent() {
    if (!this.isLocalWorkspace) return;
    
    this.isSavingContent = true;
    try {
      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/documents/${this.args.document.objectID}/content`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: this.documentContent }),
        }
      );
      
      this.flashMessages.success("Document saved successfully");
      this.isEditMode = false;
    } catch (error) {
      this.flashMessages.critical("Failed to save document", {
        title: "Error",
      });
      console.error("Error saving document content:", error);
    } finally {
      this.isSavingContent = false;
    }
  }

  @action protected toggleEditMode() {
    if (!this.isEditMode) {
      this.loadDocumentContent();
    }
    this.isEditMode = !this.isEditMode;
  }

  @action protected cancelEdit() {
    this.isEditMode = false;
    this.documentContent = "";
  }

  @action protected updateContent(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.documentContent = target.value;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Document: typeof DocumentIndexComponent;
  }
}
