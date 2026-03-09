import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import htmlElement from "hermes/utils/html-element";
import { schedule } from "@ember/runloop";
import type ConfigService from "hermes/services/config";
import type FetchService from "hermes/services/fetch";
import type RouterService from "@ember/routing/router-service";
import type { HermesDocument } from "hermes/types/document";
import type Transition from "@ember/routing/transition";
import type { HermesDocumentType } from "hermes/types/document-type";
import type AuthenticatedDocumentController from "hermes/controllers/authenticated/document";
import type RecentlyViewedService from "hermes/services/recently-viewed";
import { assert } from "@ember/debug";
import type HermesFlashMessagesService from "hermes/services/flash-messages";
import { FLASH_MESSAGES_LONG_TIMEOUT } from "hermes/utils/ember-cli-flash/timeouts";
import type StoreService from "hermes/services/store";

interface AuthenticatedDocumentRouteParams {
  document_id: string;
  draft: boolean;
}

interface DocumentRouteModel {
  doc: HermesDocument;
  docType: HermesDocumentType;
  viewerIsGroupApprover: boolean;
}

export default class AuthenticatedDocumentViewRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare recentlyViewed: RecentlyViewedService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare router: RouterService;
  @service declare store: StoreService;

  declare controller: AuthenticatedDocumentController;

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

    if (params.draft) {
      try {
        doc = await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/drafts/` +
              params.document_id,
            {
              method: "GET",
              headers: { "Add-To-Recently-Viewed": "true" },
            },
          )
          .then((r) => r?.json());
        draftFetched = true;
        peopleToMaybeFetch.push((doc as HermesDocument).owners?.[0]);
      } catch (_err) {
        transition.abort();
        this.router.transitionTo("authenticated.document-view", params.document_id);
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
              headers: { "Add-To-Recently-Viewed": "true" },
            },
          )
          .then((r) => r?.json());
        peopleToMaybeFetch.push((doc as HermesDocument).owners?.[0]);
      } catch (err) {
        const typedError = err as Error;
        this.showErrorMessage(typedError);
        if (transition.from && transition.to && transition.from.name !== transition.to.name) {
          this.router.transitionTo(transition.from.name);
        } else {
          this.router.transitionTo("authenticated.dashboard");
        }
        throw new Error(typedError.message);
      }
    }

    let viewerIsGroupApprover = false;
    if (this.configSvc.config.group_approvals) {
      const resp = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/approvals/${params.document_id}`,
          { method: "OPTIONS" },
        )
        .then((r) => r);
      const allowed = resp?.headers.get("allowed");
      if (allowed?.includes("POST")) viewerIsGroupApprover = true;
    }

    const typedDoc = doc as HermesDocument;
    typedDoc.isDraft = typedDoc.status === "WIP";

    if (typedDoc.contributors?.length) peopleToMaybeFetch.push(...typedDoc.contributors);
    if (typedDoc.approvers?.length) peopleToMaybeFetch.push(...typedDoc.approvers);
    if (typedDoc.approverGroups?.length) peopleToMaybeFetch.push(...typedDoc.approverGroups);

    const customFields = typedDoc.customEditableFields;
    if (customFields) {
      const customPeopleFields = Object.entries(customFields)
        .filter(([_k, attrs]) => attrs.type === "PEOPLE")
        .map(([k]) => k);
      customPeopleFields.forEach((field) => {
        // @ts-ignore dynamic field
        const value = typedDoc[field];
        if (Array.isArray(value)) peopleToMaybeFetch.push(...value);
      });
      for (const [_k, value] of Object.entries(customFields)) {
        if (Array.isArray(value)) peopleToMaybeFetch.push(...value);
      }
    }

    // Filter out undefined/null values (compact replacement for Ember 5.x)
    await this.store.maybeFetchPeople.perform(peopleToMaybeFetch.filter(Boolean));

    return {
      doc: typedDoc,
      docType: this.docType(typedDoc),
      viewerIsGroupApprover,
    };
  }

  afterModel(model: DocumentRouteModel, transition: any) {
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

    if (transition.from && transition.from.name === transition.to.name) {
      if (
        transition.from.params.document_id !==
        transition.to.params.document_id
      ) {
        this.controller.set("modelIsChanging", true);
        htmlElement(".sidebar-body").scrollTop = 0;
        schedule("afterRender", () => this.controller.set("modelIsChanging", false));
      }
    }
  }
}
