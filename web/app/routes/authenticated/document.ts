// @ts-nocheck - Not yet typed
import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import timeAgo from "hermes/utils/time-ago";
import RSVP from "rsvp";
import parseDate from "hermes/utils/parse-date";
import htmlElement from "hermes/utils/html-element";
import { scheduleOnce } from "@ember/runloop";

const serializePeople = (people) =>
  people.map((p) => ({
    email: p.emailAddresses[0].value,
    imgURL: p.photos?.[0]?.url,
  }));

export default class DocumentRoute extends Route {
  @service algolia;
  @service("config") configSvc;
  @service("fetch") fetchSvc;
  @service("recently-viewed-docs") recentDocs;
  @service session;
  @service flashMessages;
  @service router;

  // Ideally we'd refresh the model when the draft query param changes, but
  // because of a suspected bug in Ember, we can't do that.
  // https://github.com/emberjs/ember.js/issues/19260
  // queryParams = {
  //   draft: {
  //     refreshModel: true,
  //   },
  // };

  showErrorMessage(err) {
    this.flashMessages.add({
      title: "Error fetching document",
      message: err.message,
      type: "critical",
      sticky: true,
      extendedTimeout: 1000,
    });
  }

  async model(params, transition) {
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
          .then((r) => r.json());

        doc.isDraft = params.draft;
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
          .then((r) => r.json());

        doc.isDraft = false;
      } catch (err) {
        this.showErrorMessage(err);

        // Transition to dashboard
        this.router.transitionTo("authenticated.dashboard");
        throw new Error(errorMessage);
      }
    }

    // With the document fetched and added to the db's RecentlyViewedDocs index,
    // make a background call to update the front-end index.
    void this.recentDocs.fetchAll.perform();

    if (!!doc.createdTime) {
      doc.createdDate = parseDate(doc.createdTime * 1000, "long");
    }

    // Record analytics.
    try {
      await this.fetchSvc.fetch("/api/v1/web/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: params.document_id,
          product_name: doc.product,
        }),
      });
    } catch (err) {
      console.log("Error recording analytics: " + err);
    }

    // Load the document as well as the logged in user info

    // Preload avatars for all approvers in the Algolia index.
    if (doc.contributors?.length) {
      const contributors = await this.fetchSvc
        .fetch(`/api/v1/people?emails=${doc.contributors.join(",")}`)
        .then((r) => r.json());

      if (contributors) {
        doc.contributors = serializePeople(contributors);
      } else {
        doc.contributors = [];
      }
    }
    if (doc.approvers?.length) {
      const approvers = await this.fetchSvc
        .fetch(`/api/v1/people?emails=${doc.approvers.join(",")}`)
        .then((r) => r.json());

      if (approvers) {
        doc.approvers = serializePeople(approvers);
      } else {
        doc.approvers = [];
      }
    }

    let docTypes = await this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((r) => r.json());

    let docType = docTypes.find((docType) => docType.name === doc.docType);

    return RSVP.hash({
      doc,
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
  afterModel(model, transition) {
    if (transition.from) {
      if (transition.from.name === transition.to.name) {
        if (
          transition.from.params.document_id !==
          transition.to.params.document_id
        ) {
          this.controller.set("modelIsChanging", true);

          htmlElement(".sidebar-body").scrollTop = 0;

          scheduleOnce("afterRender", () => {
            this.controller.set("modelIsChanging", false);
          });
        }
      }
    }
  }
}
