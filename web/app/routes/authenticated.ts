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
    /**
     * If the user is dry-loading the results route with a query,
     * we capture the query on our controller and pass it to the search input.
     */
    const { to } = transition;
    const query = to.queryParams["q"];

    if (query && to.name.includes("results")) {
      (this.controllerFor("authenticated") as AuthenticatedController).set(
        "query",
        query,
      );
    }

    /**
     * If using Google auth, check if the session is authenticated.
     * If unauthenticated, it will redirect to the auth screen.
     */
    if (!this.configSvc.config.skip_google_auth) {
      this.session.requireAuthentication(transition, "authenticate");
    }
  }

  // Note: Only called if the session is authenticated in the front end
  async afterModel() {
    /**
     * Checks if the session is authenticated in the back end.
     * If the `loadInfo` task returns a 401, it will bubble up to the
     * application error method which invalidates the session
     * and redirects to the auth screen.
     */
    const loadInfoPromise = this.authenticatedUser.loadInfo.perform();

    /**
     * Fetch the product areas for the ProductAvatar and
     * ProductSelect components.
     */
    const loadProductAreasPromise = this.productAreas.fetch.perform();

    /**
     * Wait for both promises to resolve.
     */
    await Promise.all([loadInfoPromise, loadProductAreasPromise]);

    /**
     * Kick off the task to poll for expired auth.
     */
    void this.session.pollForExpiredAuth.perform();
  }
}
