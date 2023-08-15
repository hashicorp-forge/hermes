import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import { HermesDocumentType } from "hermes/types/document-type";

export default class AuthenticatedDocTypesRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model() {
    return (await this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((response) => response?.json())) as HermesDocumentType[];
  }
}
