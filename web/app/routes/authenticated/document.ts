import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import htmlElement from "hermes/utils/html-element";
import { schedule } from "@ember/runloop";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import { HermesDocument, HermesUser } from "hermes/types/document";
import Transition from "@ember/routing/transition";
import { HermesDocumentType } from "hermes/types/document-type";
import AuthenticatedDocumentController from "hermes/controllers/authenticated/document";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { assert } from "@ember/debug";
import { GoogleUser } from "hermes/components/inputs/people-select";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import { FLASH_MESSAGES_LONG_TIMEOUT } from "hermes/utils/ember-cli-flash/timeouts";

const serializePeople = (people: GoogleUser[]): HermesUser[] => {
  return people.map((p) => ({
    email: p.emailAddresses[0]?.value as string,
    imgURL: p.photos?.[0]?.url,
  }));
};

interface AuthenticatedDocumentRouteParams {
  document_id: string;
  draft: boolean;
}

interface DocumentRouteModel {
  doc: HermesDocument;
  docType: HermesDocumentType;
}

export default class AuthenticatedDocumentRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service("recently-viewed-docs")
  declare viewedDocs: RecentlyViewedDocsService;
  @service declare flashMessages: HermesFlashMessagesService;
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
    this.flashMessages.critical(err.message, {
      title: "Error fetching document",
      timeout: FLASH_MESSAGES_LONG_TIMEOUT,
    });
  }

  async docType(doc: HermesDocument) {
    const docTypes = (await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/document-types`)
      .then((r) => r?.json())) as HermesDocumentType[];

    assert("docTypes must exist", docTypes);

    const docType = docTypes.find((dt) => dt.name === doc.docType);

    assert("docType must exist", docType);
    return docType;
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
          .fetch(
            `/api/${this.configSvc.config.api_version}/drafts/` +
              params.document_id,
            {
              method: "GET",
              headers: {
                // We set this header to differentiate between document views and
                // requests to only retrieve document metadata.
                "Add-To-Recently-Viewed": "true",
              },
            },
          )
          .then((r) => r?.json());
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
          .fetch(
            `/api/${this.configSvc.config.api_version}/documents/` +
              params.document_id,
            {
              method: "GET",
              headers: {
                // We set this header to differentiate between document views and
                // requests to only retrieve document metadata.
                "Add-To-Recently-Viewed": "true",
              },
            },
          )
          .then((r) => r?.json());
      } catch (err) {
        const typedError = err as Error;
        this.showErrorMessage(typedError);

        if (transition.from && transition.from.name !== transition.to.name) {
          this.router.transitionTo(transition.from.name);
        } else {
          this.router.transitionTo("authenticated.dashboard");
        }

        throw new Error(typedError.message);
      }
    }

    const typedDoc = doc as HermesDocument;

    typedDoc.isDraft = typedDoc.status === "WIP";

    // Preload avatars for all approvers in the Algolia index.
    if (typedDoc.contributors?.length) {
      const contributors = await this.fetchSvc
        .fetch(
          `/api/${
            this.configSvc.config.api_version
          }/people?emails=${typedDoc.contributors.join(",")}`,
        )
        .then((r) => r?.json());

      if (contributors) {
        typedDoc.contributorObjects = serializePeople(contributors);
      } else {
        typedDoc.contributorObjects = [];
      }
    }
    if (typedDoc.approvers?.length) {
      const approvers = await this.fetchSvc
        .fetch(
          `/api/${
            this.configSvc.config.api_version
          }/people?emails=${typedDoc.approvers.join(",")}`,
        )
        .then((r) => r?.json());

      if (approvers) {
        typedDoc.approverObjects = serializePeople(approvers);
      } else {
        typedDoc.approverObjects = [];
      }
    }

    return {
      doc: typedDoc,
      docType: this.docType(typedDoc),
    };
  }

  afterModel(model: DocumentRouteModel, transition: any) {
    /**
     * Generally speaking, ensure an up-to-date list of recently viewed docs
     * by the time the user returns to the dashboard.
     */
    void this.viewedDocs.fetchAll.perform();

    /**
     * Record the document view with the analytics backend.
     */
    void this.fetchSvc.fetch(
      `/api/${this.configSvc.config.api_version}/web/analytics`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: model.doc.objectID,
          product_name: model.doc.product,
        }),
      },
    );

    /**
     * Once the model has resolved, check if the document is loading from
     * another document, as is the case in related Hermes documents.
     * In those cases, we scroll the sidebar to the top and toggle the
     * `modelIsChanging` property to remove and rerender the sidebar,
     * resetting its local state to reflect the new model data.
     */
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
