import Route from "@ember/routing/route";
import type RouterService from "@ember/routing/router-service";
import type Transition from "@ember/routing/transition";
import { inject as service } from "@ember/service";
import type HermesFlashMessagesService from "hermes/services/flash-messages";

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
