import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class ToolbarService extends Service {
  @tracked sortBy = "dateDesc";
}
