import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import DocumentTypesService from "hermes/services/document-types";

export default class AuthenticatedDocTypesRoute extends Route {
  @service declare documentTypes: DocumentTypesService;

  async model() {
    if (!this.documentTypes.index) {
      await this.documentTypes.fetch.perform();
    }
  }
}
