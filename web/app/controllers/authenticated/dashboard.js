import Controller from "@ember/controller";
import { alias } from "@ember/object/computed";
import { inject as service } from "@ember/service";

export default class AuthenticatedDashboardController extends Controller {
  @alias("model.docsWaitingForReview") docsWaitingForReview;

  @service router;
  @service authenticatedUser;
  @service("config") configSvc;
  @service("recently-viewed-docs") recentDocs;

  queryParams = ["latestUpdates"];
  latestUpdates = "newDocs";
}
