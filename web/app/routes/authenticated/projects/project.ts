import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";

export default class ProjectRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model(params: { project_id: string }) {
    // TODO: Intercept with Mirage
    return await this.fetchSvc
      .fetch("/api/v1/projects/" + params.project_id)
      .then((response) => response?.json())
      .catch((e) => {
        console.error("Error fetching project", e);
        return null;
      });
  }
}
