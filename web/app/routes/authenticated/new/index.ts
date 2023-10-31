import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesDocumentType } from "hermes/types/document-type";

export default class AuthenticatedNewIndexRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

  async model() {
    return (await this.fetchSvc
      .fetch("/document-types")
      .then((r) => r?.json())) as HermesDocumentType[];
  }
}
