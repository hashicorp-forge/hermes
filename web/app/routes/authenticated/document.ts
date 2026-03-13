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

interface RedirectModel {
  document_id: string;
  redirectUrl: string;
}

export default class AuthenticatedDocumentRoute extends Route {
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

  /**
   * Try a HEAD request to detect SharePoint documents.
   * If the backend responds with X-Direct-Edit-URL header, this is a
   * SharePoint document and we should redirect to the external editor.
   * For Google documents, the header is not present and we fall through
   * to the normal in-app document viewing flow.
   *
   * Returns the redirect URL if SharePoint, null otherwise.
   * Throws on 404 or other errors.
   */
  private async detectSharePointRedirect(
    params: AuthenticatedDocumentRouteParams,
    transition: Transition,
  ): Promise<string | null> {
    const isDraft = !!(transition.to as any)?.queryParams?.draft || params.draft;
    const base = isDraft ? "drafts" : "documents";
    const endpoint = `/api/${this.configSvc.config.api_version}/${base}/${params.document_id}`;

    try {
      const resp = await this.fetchSvc.fetch(endpoint, {
        method: "HEAD",
        redirect: "manual",
        headers: { "Add-To-Recently-Viewed": "true" },
      });

      const loc = resp?.headers.get("X-Direct-Edit-URL");
      if (loc) {
        return loc; // SharePoint document
      }

      // No header — Google document, fall through
      return null;
    } catch (e) {
      if (this.fetchSvc.getErrorCode(e as Error) === 404) {
        this.flashMessages.critical("Document not found", {
          title: "Error accessing document",
          timeout: FLASH_MESSAGES_LONG_TIMEOUT,
        });
        transition.abort();
        throw new Error("Document not found");
      }

      // Network error or CORS — fall through to GET flow
      return null;
    }
  }

  async model(
    params: AuthenticatedDocumentRouteParams,
    transition: Transition,
  ): Promise<DocumentRouteModel | RedirectModel | void> {
    // --- SharePoint detection ---
    // HEAD request checks for X-Direct-Edit-URL header.
    // Only SharePoint backend sets this header; Google backend returns
    // 200 without it, so we fall through to the normal GET flow.
    try {
      const redirectUrl = await this.detectSharePointRedirect(params, transition);
      if (redirectUrl) {
        return { document_id: params.document_id, redirectUrl };
      }
    } catch (_e) {
      // 404 already handled with flash message + abort
      return;
    }

    // --- Google document flow (original hermes behavior) ---
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

        if (transition.from && transition.to && transition.from.name !== transition.to.name) {
          this.router.transitionTo(transition.from.name);
        } else {
          this.router.transitionTo("authenticated.dashboard");
        }

        throw new Error(typedError.message);
      }
    }

    // Check if viewer is a group approver.
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

    if (typedDoc.contributors?.length) {
      // Add the contributors to the list of people to fetch.
      peopleToMaybeFetch.push(...typedDoc.contributors);
    }

    if (typedDoc.approvers?.length) {
      // Add the approvers to the list of people to fetch.
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
    await this.store.maybeFetchPeople.perform(
      peopleToMaybeFetch.filter(Boolean),
    );

    return {
      doc: typedDoc,
      docType: await this.docType(typedDoc),
      viewerIsGroupApprover,
    };
  }

  afterModel(
    model: DocumentRouteModel | RedirectModel | void,
    transition: any,
  ) {
    if (!model) return;

    // SharePoint redirect — navigate to external editor.
    if ("redirectUrl" in model && model.redirectUrl) {
      setTimeout(() => {
        window.location.replace(model.redirectUrl);
      }, 500);
      return;
    }

    // Google document — record analytics and handle in-app navigation.
    if ("doc" in model) {
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
}
