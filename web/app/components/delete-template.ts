import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { getOwner } from "@ember/application";
import { inject as service } from "@ember/service";
import { restartableTask, task } from "ember-concurrency";
import { dasherize } from "@ember/string";
import cleanString from "hermes/utils/clean-string";
import { debounce } from "@ember/runloop";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { AuthenticatedUser } from "hermes/services/authenticated-user";
import { HermesDocument, HermesTemplate, HermesUser } from "hermes/types/document";
import { assert } from "@ember/debug";
import Route from "@ember/routing/route";

interface DeleteTemplateComponentSignature {
  Args: {
    template: HermesTemplate;
  };
}

export default class DeleteTemplateComponent extends Component<DeleteTemplateComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare session: SessionService;
  @service declare flashMessages: FlashMessageService;

  @tracked deleteModalIsActive = false;

  @action closeDeleteModal() {
    this.deleteModalIsActive = false;
  }

  get templateID() {
    return this.args.template?.objectId;
  }

  get modalIsActive() {
    return (
      this.deleteModalIsActive
    );
  }

  

  @action maybeShowFlashError(error: Error, title: string) {
    if (!this.modalIsActive) {
      this.showFlashError(error, title);
    }
  }

  showFlashError(error: Error, title: string) {
    this.flashMessages.add({
      title,
      message: error.message,
      type: "critical",
      timeout: 6000,
      extendedTimeout: 1000,
      preventDuplicates: true,
    });
  }

  protected subDeleteTemplate = (async (templateID: string) => {
    try {
      let fetchResponse = await this.fetchSvc.fetch("/api/v1/custom-template/" + templateID, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!fetchResponse?.ok) {
        this.showError(fetchResponse?.statusText);
      } else {
        this.flashMessages.add({
          message: "Template deleted",
          title: "Done!",
          type: "success",
          timeout: 6000,
          extendedTimeout: 1000,
        });

        this.router.transitionTo("authenticated.new");
        window.location.reload();
      }
    } catch (e) {
      this.showError(e);
      throw e;
    }
  });

  deleteTemplate = task(async () => {
    try {
      await this.subDeleteTemplate(this.templateID);
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Unable to delete draft");
      throw error;
    }
  });

  protected showError(e?: unknown) {
    this.flashMessages.add({
      title: "Error deleting Template",
      message: e as string,
      type: "critical",
      timeout: 6000,
      extendedTimeout: 1000,
    });
  }
}
