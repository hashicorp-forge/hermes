import Component from "@glimmer/component";
import { service } from "@ember/service";
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

  /**
   * Get user profile, returning a guest profile if user info is not loaded
   * (e.g., when using Dex authentication without OIDC flow)
   */
  protected get profile() {
    return this.authenticatedUser.info;
  }

  @action protected toggleSidebarCollapsedState() {
    this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Document: typeof DocumentIndexComponent;
  }
}
