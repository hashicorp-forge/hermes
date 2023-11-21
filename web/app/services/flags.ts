import Service, { inject as service } from "@ember/service";
import ConfigService from "./config";

export default class FlagsService extends Service {
  @service("config") declare configSvc: ConfigService;

  get projects() {
    return this.configSvc.config.feature_flags?.["projects"];
  }
}
