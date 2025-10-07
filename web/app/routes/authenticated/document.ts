import Route from "@ember/routing/route";
import { service } from "@ember/service";
import htmlElement from "hermes/utils/html-element";
import { schedule } from "@ember/runloop";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";
import Transition from "@ember/routing/transition";
import { HermesDocumentType } from "hermes/types/document-type";
import AuthenticatedDocumentController from "hermes/controllers/authenticated/document";
import RecentlyViewedService from "hermes/services/recently-viewed";
import { assert } from "@ember/debug";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import { FLASH_MESSAGES_LONG_TIMEOUT } from "hermes/utils/ember-cli-flash/timeouts";
import StoreService from "hermes/services/store";

interface AuthenticatedDocumentRouteParams {
  document_id: string;
  draft: boolean;
}

interface DocumentRouteModel {
  doc: HermesDocument;
  docType: HermesDocumentType;
  viewerIsGroupApprover: boolean;
}

export enum DocStatus {
  Draft = "WIP",
  Approved = "Approved",
  InReview = "In-Review",
  Archived = "Obsolete",
}

export enum DocStatusLabel {
  Draft = "Draft",
  Approved = "Approved",
  InReview = "In Review",
  Archived = "Archived",
}

export default class AuthenticatedDocumentRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare recentlyViewed: RecentlyViewedService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare router: RouterService;
  @service declare store: StoreService;

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
    let peopleToMaybeFetch: Array<string | undefined> = [];

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

        // Add the draft owner to the list of people to fetch.
        peopleToMaybeFetch.push((doc as HermesDocument).owners?.[0]);
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

        // Add the doc owner to the list of people to fetch.
        peopleToMaybeFetch.push((doc as HermesDocument).owners?.[0]);
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

    let viewerIsGroupApprover = false;

    // Check if the user is a group approver.

    if (this.configSvc.config.group_approvals) {
      const resp = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/approvals/${params.document_id}`,
          { method: "OPTIONS" },
        )
        .then((r) => r);

      const allowed = resp?.headers.get("allowed");

      if (allowed?.includes("POST")) {
        viewerIsGroupApprover = true;
      }
    }

    const typedDoc = doc as HermesDocument;

    typedDoc.isDraft = typedDoc.status === "WIP";

    // Push the document's people into the store.

    if (typedDoc.contributors?.length) {
      peopleToMaybeFetch.push(...typedDoc.contributors);
    }

    if (typedDoc.approvers?.length) {
      peopleToMaybeFetch.push(...typedDoc.approvers);
    }

    if (typedDoc.approverGroups?.length) {
      peopleToMaybeFetch.push(...typedDoc.approverGroups);
    }

    const customFields = typedDoc.customEditableFields;

    if (customFields) {
      const customPeopleFields = Object.entries(customFields)
        .filter(([_key, attrs]) => attrs.type === "PEOPLE")
        .map(([key, _attrs]) => key);

      /**
       * These custom people fields are attributes on the document.
       * E.g., a custom of "stakeholders" field would be `typedDoc.stakeholders`.
       * We grab the these attributes and add them to the list of people to fetch.
       */
      customPeopleFields.forEach((field) => {
        // @ts-ignore - Valid but can't be re-cast
        const value = typedDoc[field];

        if (Array.isArray(value)) {
          peopleToMaybeFetch.push(...value);
        }
      });
    }

    if (customFields) {
      /**
       * If the value is an array, that means it's a PEOPLE field
       * and we can add its values to the list of people to fetch.
       */
      for (const [_key, value] of Object.entries(customFields)) {
        if (Array.isArray(value)) {
          peopleToMaybeFetch.push(...value);
        }
      }
    }

    // Load people into the store.
    await this.store.maybeFetchPeople.perform(peopleToMaybeFetch.compact());

    return {
      doc: typedDoc,
      docType: this.docType(typedDoc),
      viewerIsGroupApprover,
    };
  }

  afterModel(model: DocumentRouteModel, transition: any) {
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
