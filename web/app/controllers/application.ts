import Controller from "@ember/controller";
import config from "hermes/config/environment";

export default class ApplicationController extends Controller {
  protected get animatedToolsAreShown() {
    if (config.environment === "development") {
      return config.showEmberAnimatedTools;
    } else {
      return false;
    }
  }
}
