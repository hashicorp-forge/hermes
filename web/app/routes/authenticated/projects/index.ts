import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model(): Promise<Record<string, HermesProject>> {
    return await this.fetchSvc
      .fetch("/projects")
      .then((response) => response?.json());
  }
}
