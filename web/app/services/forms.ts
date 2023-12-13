import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class FormsService extends Service {
  @tracked projectIsBeingCreated = false;
}

declare module "@ember/service" {
  interface Registry {
    forms: FormsService;
  }
}
