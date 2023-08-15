import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";

export default class AuthenticatedDocTypesRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model() {
    // call the api/v1/document-types endpoint
    return await this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((response) => response?.json());
  }
}
