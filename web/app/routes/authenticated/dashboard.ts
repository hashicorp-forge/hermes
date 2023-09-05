import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import SessionService from "hermes/services/session";
import AuthenticatedUserService from "hermes/services/authenticated-user";

// @ts-ignore - Not yet typed
import timeAgo from "hermes/utils/time-ago";
import { HermesDocument } from "hermes/types/document";

export default class DashboardRoute extends Route {
  @service declare algolia: AlgoliaService;
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service("recently-viewed-docs")
  declare recentDocs: RecentlyViewedDocsService;
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async model(): Promise<HermesDocument[]> {
    const userInfo = this.authenticatedUser.info;

    const docsAwaitingReview = await this.algolia.searchIndex
      .perform(this.configSvc.config.algolia_docs_index_name, "", {
        filters:
          `approvers:'${userInfo.email}'` +
          ` AND NOT approvedBy:'${userInfo.email}'` +
          " AND appCreated:true" +
          " AND status:In-Review",
      })
      .then((result) => {
        // Add modifiedAgo for each doc.
        for (const hit of result.hits) {
          this.fetchSvc
            .fetch("/api/v1/documents/" + hit.objectID)
            .then((resp) => resp?.json())
            .then((doc) => {
              if (doc.modifiedTime) {
                const modifiedDate = new Date(doc.modifiedTime * 1000);
                // @ts-ignore
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
        return result.hits as HermesDocument[];
      });

    /**
     * If the user is loading the dashboard for the first time,
     * we await the `fetchAll` task so we can display the
     * documents at the same time as the rest of the layout.
     *
     * If a user leaves and returns to the dashboard, we call `fetchAll`
     * but don't await it. This speeds up the transition and is especially
     * efficient when the RecentDocs list hasn't changed since its last load.
     *
     * It's possible for the user to see the RecentDocs list update
     * in real time (by visiting a document and very quickly clicking back),
     * but unlikely, since we call `fetchAll` in the `/document` route,
     * just after the doc is marked viewed. In most cases, the task will be
     * finished by the time the user returns to the dashboard.
     *
     */
    if (this.recentDocs.all) {
      void this.recentDocs.fetchAll.perform();
    } else {
      await this.recentDocs.fetchAll.perform();
    }

    return docsAwaitingReview;
  }

  /**
   * Builds a parent query string for searching for Google files. The folders
   * parameter is an array of all folder ID strings to search.
   */
  // @ts-ignore - Not yet typed
  buildParentsQuery(folders) {
    let parentsQuery = "";
    if (folders.length > 0) {
      parentsQuery += " and (";
      // @ts-ignore - Not yet typed
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
