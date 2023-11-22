import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { dropTask } from "ember-concurrency";
import { HermesDocument } from "hermes/types/document";
import { AuthenticatedUser } from "hermes/services/authenticated-user";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { HermesDocumentType } from "hermes/types/document-type";
import HermesFlashMessagesService from "hermes/services/flash-messages";

interface DocumentIndexComponentSignature {
  Args: {
    document: HermesDocument;
    modelIsChanging: boolean;
    docType: Promise<HermesDocumentType>;
  };
}

export default class DocumentIndexComponent extends Component<DocumentIndexComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUser;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service("recently-viewed-docs")
  declare recentDocs: RecentlyViewedDocsService;

  @tracked sidebarIsCollapsed = false;

  @action protected toggleSidebarCollapsedState() {
    this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
  }

  protected deleteDraft = dropTask(async (docID: string) => {
    try {
      let fetchResponse = await this.fetchSvc.fetch("/drafts/" + docID, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!fetchResponse?.ok) {
        this.showError(fetchResponse?.statusText);
      } else {
        void this.recentDocs.fetchAll.perform();

        this.flashMessages.add({
          message: "Document draft deleted",
          title: "Done!",
        });

        this.router.transitionTo("authenticated.drafts");
      }
    } catch (e) {
      this.showError(e);
      throw e;
    }
  });

  protected showError(e?: unknown) {
    this.flashMessages.critical((e as any).message, {
      title: "Error deleting draft",
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Document: typeof DocumentIndexComponent;
  }
}
