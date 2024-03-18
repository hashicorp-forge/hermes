import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import StoreService from "hermes/services/store";
import { ProjectStatus } from "hermes/types/project-status";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare store: StoreService;

  // Have the model react to param changes
  queryParams = {
    status: {
      refreshModel: true,
    },
  };

  async model(params: { status: string }) {
    const projects = await this.store.findAll("project");

    console.log("projects", projects);

    // We'll eventually use the status param in the query;
    // for now, we pass it to the component for local filtering

    return { projects, status: params.status as ProjectStatus };
  }
}
