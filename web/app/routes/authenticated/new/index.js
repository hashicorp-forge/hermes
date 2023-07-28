import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

export default class AuthenticatedNewIndexRoute extends Route {
  @service("fetch") fetchSvc;
  @service authenticatedUser;

  async model() {
    return await this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((r) => r.json());
  }
}
