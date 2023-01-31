import Controller from "@ember/controller";
import { alias } from "@ember/object/computed";
import { inject as service } from "@ember/service";

export default class AuthenticatedDashboardController extends Controller {
  @alias("model.docsWaitingForReview") docsWaitingForReview;
  @alias("model.recentlyViewedDocs") recentlyViewedDocs;

  @service router;
  @service authenticatedUser;
  @service("config") configSvc;

  queryParams = ["latestUpdates"];
  latestUpdates = "newDocs";
}
