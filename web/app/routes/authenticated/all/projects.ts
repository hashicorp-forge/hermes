import Route from "@ember/routing/route";

export default class AuthenticatedAllProjectsRoute extends Route {
  async model(params: any) {
    return { params };
  }
}
