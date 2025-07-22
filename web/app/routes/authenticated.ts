import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedController from "hermes/controllers/authenticated";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import ProductAreasService from "hermes/services/product-areas";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare productAreas: ProductAreasService;

  beforeModel(transition: any) {
    console.log("AuthenticatedRoute: Entering beforeModel");

    const { to } = transition;
    const query = to.queryParams["q"];
    console.log("AuthenticatedRoute: Transitioning to route:", to.name, "with query:", query);

    if (query && to.name.includes("results")) {
      console.log("AuthenticatedRoute: Setting query on controller");
      (this.controllerFor("authenticated") as AuthenticatedController).set(
        "query",
        query,
      );
    }

    if (!this.configSvc.config.skip_google_auth) {
      console.log("AuthenticatedRoute: Checking session authentication");
      this.session.requireAuthentication(transition, "authenticate");
    }
  }

  async afterModel() {
    console.log("AuthenticatedRoute: Entering afterModel");

    try {
      console.log("AuthenticatedRoute: Loading authenticated user info");
      const loadInfoPromise = this.authenticatedUser.loadInfo.perform();

      console.log("AuthenticatedRoute: Fetching product areas");
      const loadProductAreasPromise = this.productAreas.fetch.perform();

      await Promise.all([loadInfoPromise, loadProductAreasPromise]);
      console.log("AuthenticatedRoute: Successfully loaded user info and product areas");

      console.log("AuthenticatedRoute: Starting poll for expired auth");
      void this.session.pollForExpiredAuth.perform();
    } catch (error) {
      console.error("AuthenticatedRoute: Error in afterModel", error);
    }
  }
}
