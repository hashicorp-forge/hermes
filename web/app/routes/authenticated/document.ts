import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import htmlElement from "hermes/utils/html-element";
import { schedule } from "@ember/runloop";
import FetchService from "hermes/services/fetch";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";
import Transition from "@ember/routing/transition";
import { HermesDocumentType } from "hermes/types/document-type";
import AuthenticatedDocumentController from "hermes/controllers/authenticated/document";

interface AuthenticatedDocumentRouteParams {
  document_id: string;
  draft: boolean;
}

interface AuthenticatedDocumentRouteModel {
  doc: HermesDocument;
  docType: HermesDocumentType;
}

export default class AuthenticatedDocumentRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flashMessages: FlashMessageService;
  @service declare router: RouterService;

  declare controller: AuthenticatedDocumentController;

  // Ideally we'd refresh the model when the draft query param changes, but
  // because of a suspected bug in Ember, we can't do that.
  // https://github.com/emberjs/ember.js/issues/19260
  // queryParams = {
  //   draft: {
  //     refreshModel: true,
  //   },
  // };

  showErrorMessage(err: Error) {
    this.flashMessages.add({
      title: "Error fetching document",
      message: err.message,
      type: "critical",
      sticky: true,
      extendedTimeout: 1000,
    });
  }

  async model(
    params: AuthenticatedDocumentRouteParams,
    transition: Transition,
  ) {
    let doc = {};
    let draftFetched = false;

    // Get doc data from the app backend.
    if (params.draft) {
      try {
        doc = await this.fetchSvc
          .fetch("/api/v1/drafts/" + params.document_id, {
            method: "GET",
            headers: {
              // We set this header to differentiate between document views and
              // requests to only retrieve document metadata.
              "Add-To-Recently-Viewed": "true",
            },
          })
          .then((r) => r?.json());
        (doc as HermesDocument).isDraft = params.draft;
        draftFetched = true;
      } catch (err) {
        /**
         * The doc may have been published since the user last viewed it
         * (i.e., it moved from /drafts to /documents in the back end),
         * so we retry the model hook without the draft param.
         * Any subsequent errors are handled in the catch block below.
         */
        transition.abort();
        this.router.transitionTo("authenticated.document", params.document_id);
      }
    }

    if (!draftFetched) {
      try {
        doc = await this.fetchSvc
          .fetch("/api/v1/documents/" + params.document_id, {
            method: "GET",
            headers: {
              // We set this header to differentiate between document views and
              // requests to only retrieve document metadata.
              "Add-To-Recently-Viewed": "true",
            },
          })
          .then((r) => r?.json());

        (doc as HermesDocument).isDraft = false;
      } catch (err) {
        const typedError = err as Error;
        this.showErrorMessage(typedError);

        // Transition to dashboard
        this.router.transitionTo("authenticated.dashboard");
        throw new Error(typedError.message);
      }
    }

    console.log("doc", doc);

    return doc as HermesDocument;
  }

  /**
   * Once the model has resolved, check if the document is loading from
   * another document, as is the case in related Hermes documents.
   * In those cases, we scroll the sidebar to the top and toggle the
   * `modelIsChanging` property to remove and rerender the sidebar,
   * resetting its local state to reflect the new model data.
   */
  afterModel(_model: AuthenticatedDocumentRouteModel, transition: any) {
    if (transition.from) {
      if (transition.from.name === transition.to.name) {
        if (
          transition.from.params.document_id !==
          transition.to.params.document_id
        ) {
          this.controller.set("modelIsChanging", true);

          htmlElement(".sidebar-body").scrollTop = 0;

          schedule("afterRender", () => {
            this.controller.set("modelIsChanging", false);
          });
        }
      }
    }
  }
}
