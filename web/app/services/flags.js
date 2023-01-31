import Service from "@ember/service";
import config from "hermes/config/environment";

export default class FlagsService extends Service {
  initialize() {
    this.setProperties(config.featureFlags);
  }
}
