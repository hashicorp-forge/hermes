import Controller from "@ember/controller";
import { action } from "@ember/object";
import { alias } from "@ember/object/computed";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { schedule } from "@ember/runloop";

export default class AuthenticatedDashboardController extends Controller {
  @alias("model.docsWaitingForReview") docsWaitingForReview;

  @service router;
  @service authenticatedUser;
  @service("config") configSvc;
  @service("recently-viewed-docs") recentDocs;

  queryParams = ["latestUpdates"];
  latestUpdates = "newDocs";

  @tracked avatarsAreLoading = false;

  @action refreshAvatars() {
    this.avatarsAreLoading = true;

    schedule("afterRender", () => {
      this.avatarsAreLoading = false;
    });
  }
}
