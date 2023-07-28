import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";
import timeAgo from "hermes/utils/time-ago";

export default class WaitingForMeRoute extends Route {
  @service algolia;
  @service("config") configSvc;
  @service("fetch") fetchSvc;
  @service session;
  @service authenticatedUser;

  async model(params) {
    const userInfo = this.authenticatedUser.info;
    const searchIndex =
      this.configSvc.config.algolia_docs_index_name + "_dueDate_asc";
    const docsWaitingForReview = this.algolia.searchIndex

      .perform(searchIndex, "", {
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
      .perform(searchIndex, "", {
        filters:
          `reviewers:'${userInfo.email}'` +
          ` AND reviewedBy:'${userInfo.email}'` +
          " AND appCreated:true",
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

    return RSVP.hash({
      docsWaitingForReview: docsWaitingForReview,
      docsReviewed: docsReviewed,
    });
  }
}
