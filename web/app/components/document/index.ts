import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { dropTask } from "ember-concurrency";
import { HermesDocument } from "hermes/types/document";
import { AuthenticatedUser } from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { HermesDocumentType } from "hermes/types/document-type";

interface DocumentIndexComponentSignature {
  Args: {
    document: HermesDocument;
    modelIsChanging: boolean;
    docType: Promise<HermesDocumentType>;
  };
}

export default class DocumentIndexComponent extends Component<DocumentIndexComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUser;
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare flashMessages: FlashMessageService;
  @service("recently-viewed-docs")
  declare recentDocs: RecentlyViewedDocsService;

  @tracked sidebarIsCollapsed = false;

  @action protected toggleSidebarCollapsedState() {
    this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
  }

  @action kickOffBackgroundTasks() {
    // Ensure an up-to-date list of recently viewed docs
    // by the time the user returns to the dashboard.
    void this.recentDocs.fetchAll.perform();

    void this.fetchSvc.fetch("/api/v1/web/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: this.args.document.objectID,
        product_name: this.args.document.product,
      }),
    });
  }

  protected deleteDraft = dropTask(async (docID: string) => {
    try {
      let fetchResponse = await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/drafts/` + docID,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

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
