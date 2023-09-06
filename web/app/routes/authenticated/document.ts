import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import RSVP from "rsvp";
import htmlElement from "hermes/utils/html-element";
import { schedule } from "@ember/runloop";
import { GoogleUser } from "hermes/components/inputs/people-select";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import AlgoliaService from "hermes/services/algolia";
import SessionService from "hermes/services/session";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import RouterService from "@ember/routing/router-service";
import { HermesDocument, HermesUser } from "hermes/types/document";
import Transition from "@ember/routing/transition";
import { HermesDocumentType } from "hermes/types/document-type";
import AuthenticatedDocumentController from "hermes/controllers/authenticated/document";

const serializePeople = (people: GoogleUser[]): HermesUser[] => {
  return people.map((p) => ({
    email: p.emailAddresses[0]?.value as string,
    imgURL: p.photos?.[0]?.url,
  }));
};

interface DocumentRouteParams {
  document_id: string;
  draft: boolean;
}

export default class DocumentRoute extends Route {
  @service("config") declare configSvcL: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service("recently-viewed-docs")
  declare recentDocs: RecentlyViewedDocsService;
  @service declare algolia: AlgoliaService;
  @service declare session: SessionService;
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

  async model(params: DocumentRouteParams, transition: Transition) {
    let doc = {};
    let draftFetched = false;

    console.log("params.draft", params.draft);
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
        return;
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
        console.log("isDraft?", (doc as HermesDocument).isDraft);
      } catch (err) {
        const typedError = err as Error;
        this.showErrorMessage(typedError);

        // Transition to dashboard
        this.router.transitionTo("authenticated.dashboard");
        throw new Error(typedError.message);
      }
    }

    // With the document fetched and added to the db's RecentlyViewedDocs index,
    // make a background call to update the front-end index.
    void this.recentDocs.fetchAll.perform();

    console.log("Document fetched: ", doc);

    let typedDoc = doc as HermesDocument;

    // Record analytics.
    try {
      await this.fetchSvc.fetch("/api/v1/web/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: params.document_id,
          product_name: typedDoc.product,
        }),
      });
    } catch (err) {
      console.log("Error recording analytics: " + err);
    }

    // Load the document as well as the logged in user info

    // Preload avatars for all approvers in the Algolia index.
    if (typedDoc.contributors?.length) {
      const contributors = await this.fetchSvc
        .fetch(`/api/v1/people?emails=${typedDoc.contributors.join(",")}`)
        .then((r) => r?.json());

      if (contributors) {
        typedDoc.contributors = serializePeople(contributors);
      } else {
        typedDoc.contributors = [];
      }
    }
    if (typedDoc.approvers?.length) {
      const approvers = await this.fetchSvc
        .fetch(`/api/v1/people?emails=${typedDoc.approvers.join(",")}`)
        .then((r) => r?.json());

      if (approvers) {
        typedDoc.approvers = serializePeople(approvers);
      } else {
        typedDoc.approvers = [];
      }
    }

    console.log("typedDoc", typedDoc);

    let docTypes = await this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((r) => r?.json());

    let docType = docTypes.find(
      (docType: HermesDocumentType) => docType.name === typedDoc.docType
    );

    return RSVP.hash({
      doc: typedDoc,
      docType,
    });
  }

  /**
   * Once the model has resolved, check if the document is loading from
   * another document, as is the case in related Hermes documents.
   * In those cases, we scroll the sidebar to the top and toggle the
   * `modelIsChanging` property to remove and rerender the sidebar,
   * resetting its local state to reflect the new model data.
   */
  afterModel(model: any, transition: any) {
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
