import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model(_params: any) {
    // TODO: Intercept this with Mirage
    return await this.fetchSvc
      .fetch("/api/v1/projects")
      .then((response) => response?.json())
      .catch((e) => {
        console.error(e);
        return null;
      });
  }
}
