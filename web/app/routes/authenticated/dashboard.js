import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";

export default class DashboardRoute extends Route {
  @service algolia;
  @service("config") configSvc;
  @service("fetch") fetchSvc;
  @service("recently-viewed-docs") recentDocs;
  @service session;
  @service authenticatedUser;

  queryParams = {
    latestUpdates: {
      refreshModel: true,
      replace: true,
    },
  };

  resetController(controller, isExiting, transition) {
    if (isExiting) {
      controller.set("latestUpdates", "newDocs");
    }
  }

  async model(params) {
    // Create facet filter for recently updated docs depending on the selected
    // "Latest updates" tab.
    let facetFilter = "";
    if (params.latestUpdates == "approved") {
      facetFilter = "status:approved";
    } else if (params.latestUpdates == "inReview") {
      facetFilter = "status:In-Review";
    }

    const userInfo = this.authenticatedUser.info;

    const docsWaitingForReview = this.algolia.searchIndex
      .perform(this.configSvc.config.algolia_docs_index_name, "", {
        filters:
          `approvers:'${userInfo.email}'` +
          ` AND NOT approvedBy:'${userInfo.email}'` +
          " AND appCreated:true" +
          " AND status:In-Review",
        hitsPerPage: 4,
      })
      .then((result) => result.hits);

    // Get recently viewed docs from app data.
    const recentlyViewedDocIDs = await this.recentDocs.get.perform();

    // For each recently viewed doc (max 4 docs), fetch doc metadata from the
    // app backend.
    const recentlyViewedPromises = recentlyViewedDocIDs
      .slice(0, 4)
      .map((docID) =>
        this.fetchSvc
          .fetch("/api/v1/documents/" + docID)
          .then((resp) => resp.json())
          .catch((err) => {
            console.log(
              `Error getting recently updated document (${hit.objectID}):`,
              err
            );
          })
      );

    // Create promise for all Algolia recently viewed docs promises.
    const recentlyViewedDocsPromise = Promise.allSettled(
      recentlyViewedPromises
    );

    // Create array of docs that we also indexed in Algolia.
    // We can't display documents without this data.
    const recentlyViewedDocs = recentlyViewedDocsPromise.then((promises) => {
      let recentlyViewedDocs = [];

      promises.forEach((promise) => {
        if (promise.status == "fulfilled") {
          recentlyViewedDocs.push(promise.value);
        }
      });

      return recentlyViewedDocs;
    });

    return RSVP.hash({
      docsWaitingForReview: docsWaitingForReview,
      recentlyViewedDocs: recentlyViewedDocs,
    });
  }

  /**
   * Builds a parent query string for searching for Google files. The folders
   * parameter is an array of all folder ID strings to search.
   */
  buildParentsQuery(folders) {
    let parentsQuery = "";
    if (folders.length > 0) {
      parentsQuery += " and (";
      folders.forEach((folder, index) => {
        if (index == 0) {
          parentsQuery += `'${folder}' in parents`;
        } else {
          parentsQuery += ` or '${folder}' in parents`;
        }
      });
      parentsQuery += ")";
    }
    return parentsQuery;
  }
}
