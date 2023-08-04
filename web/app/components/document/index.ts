import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { dropTask } from "ember-concurrency";
import { HermesDocument } from "hermes/types/document";
import { AuthenticatedUser } from "hermes/services/authenticated-user";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";

interface DocumentIndexComponentSignature {
  document: HermesDocument;
  docType: string;
  modelIsChanging: boolean;
}

export default class DocumentIndexComponent extends Component<DocumentIndexComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUser;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare flashMessages: FlashMessageService;
  @service("recently-viewed-docs")
  declare recentDocs: RecentlyViewedDocsService;

  @tracked sidebarIsCollapsed = false;

  @action protected toggleSidebarCollapsedState() {
    this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
  }

  @action protected unCollapseSidebar() {
    this.sidebarIsCollapsed = false;
  }

  protected deleteDraft = dropTask(async (docID: string) => {
    try {
      let fetchResponse = await this.fetchSvc.fetch("/api/v1/drafts/" + docID, {
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
          type: "success",
          timeout: 6000,
          extendedTimeout: 1000,
        });

        this.router.transitionTo("authenticated.drafts");
      }
    } catch (e) {
      this.showError(e);
      throw e;
    }
  });

  protected showError(e?: unknown) {
    this.flashMessages.add({
      title: "Error deleting draft",
      message: e as string,
      type: "critical",
      timeout: 6000,
      extendedTimeout: 1000,
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Document: typeof DocumentIndexComponent;
  }
}
