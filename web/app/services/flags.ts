import Service, { inject as service } from "@ember/service";
import ConfigService from "./config";

export default class FlagsService extends Service {
  @service("config") declare configSvc: ConfigService;

  // get exampleFlag() {
  //   return this.configSvc.config.feature_flags?.["example_feature"];
  // }
}
