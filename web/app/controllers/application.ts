import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import config from "hermes/config/environment";

export default class ApplicationController extends Controller {
  @service("config") declare configSvc: ConfigService;

  protected get animatedToolsAreShown() {
    if (config.environment === "development") {
      return this.configSvc.config.show_ember_animated_tools;
    } else {
      return false;
    }
  }
}
