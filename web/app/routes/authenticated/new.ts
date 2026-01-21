import Route from "@ember/routing/route";
import { service } from "@ember/service";
import DocumentTypesService from "hermes/services/document-types";

export default class AuthenticatedNewRoute extends Route {
  @service declare documentTypes: DocumentTypesService;

  async model() {
    if (!this.documentTypes.index) {
      await this.documentTypes.fetch.perform();
    }
  }
}
