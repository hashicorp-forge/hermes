import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import Transition from "@ember/routing/transition";
import { service } from "@ember/service";
import HermesFlashMessagesService from "hermes/services/flash-messages";

export default class AuthenticatedProductAreasRoute extends Route {
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare router: RouterService;

  beforeModel(transition: Transition) {
    // @ts-ignore - `intent` not defined in `Transition` type
    const transitionTo = transition.intent.url ?? transition.to.name;
    if (
      transitionTo === "/product-areas" ||
      transitionTo === "/product-areas/" ||
      transitionTo === "authenticated.product-areas" ||
      transitionTo === "authenticated.product-areas.index"
    ) {
      this.flashMessages.critical("The URL must specify a product area", {
        title: "Invalid URL",
      });

      this.router.transitionTo("authenticated.dashboard");
    }
  }
}
