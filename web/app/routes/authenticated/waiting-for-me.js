import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";
import timeAgo from "hermes/utils/time-ago";
import { action } from "@ember/object";

export default class WaitingForMeRoute extends Route {
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
    if (params.latestUpdates == "reviewed") {
      facetFilter = "status:reviewed";
    } else if (params.latestUpdates == "inReview") {
      facetFilter = "status:In-Review";
    }

    const userInfo = this.authenticatedUser.info;

    const docsWaitingForReview = this.algolia.searchIndex
      .perform(this.configSvc.config.algolia_docs_index_name, "", {
        filters:
          `reviewers:'${userInfo.email}'` +
          ` AND NOT reviewedBy:'${userInfo.email}'` +
          " AND appCreated:true" +
          " AND status:In-Review",
        hitsPerPage: 1000,
      })
      .then((result) => {
        // Add modifiedAgo for each doc.
        for (const hit of result.hits) {
          this.fetchSvc
            .fetch("/api/v1/documents/" + hit.objectID)
            .then((resp) => resp.json())
            .then((doc) => {
              if (doc.modifiedTime) {
                const modifiedDate = new Date(doc.modifiedTime * 1000);
                hit.modifiedAgo = `Modified ${timeAgo(modifiedDate)}`;
              }
            })
            .catch((err) => {
              console.log(
                `Error getting document waiting for review (${hit.objectID}):`,
                err
              );
            });
        }
        return result.hits;
      });

    const docsReviewed = this.algolia.searchIndex
      .perform(this.configSvc.config.algolia_docs_index_name, "", {
        filters:
          `reviewers:'${userInfo.email}'` +
          ` AND reviewedBy:'${userInfo.email}'` +
          " AND appCreated:true",
        // +
        // " AND status:In-Review",
        hitsPerPage: 1000,
      })
      .then((result) => {
        // Add modifiedAgo for each doc.
        for (const hit of result.hits) {
          this.fetchSvc
            .fetch("/api/v1/documents/" + hit.objectID)
            .then((resp) => resp.json())
            .then((doc) => {
              if (doc.modifiedTime) {
                const modifiedDate = new Date(doc.modifiedTime * 1000);
                hit.modifiedAgo = `Modified ${timeAgo(modifiedDate)}`;
              }
            })
            .catch((err) => {
              console.log(
                `Error getting document waiting for review (${hit.objectID}):`,
                err
              );
            });
        }
        return result.hits;
      });

    await this.recentDocs.fetchAll.perform();
    if (this.recentDocs.all === null) {
      try {
        await this.recentDocs.fetchAll.perform();
      } catch {
        /**
         * This tells our template to show the error state.
         */
        this.recentDocs.all = null;
      }
    }

    docsWaitingForReview._result = docsWaitingForReview._result.sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );
    console.log("docsReviewed : ", docsReviewed);
    return RSVP.hash({
      docsWaitingForReview: docsWaitingForReview,
      docsReviewed: docsReviewed,
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
