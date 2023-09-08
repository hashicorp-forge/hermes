import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import RouterService from "@ember/routing/router-service";
import { HermesDocumentType } from "hermes/types/document-type";
import { assert } from "@ember/debug";

interface AuthenticatedNewDocRouteParams {
  docType: string;
}

export default class AuthenticatedNewDocRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flashMessages: FlashMessageService;
  @service declare router: RouterService;

  queryParams = {
    docType: {
      refreshModel: true,
    },
  };

  model(params: AuthenticatedNewDocRouteParams) {
    const docTypes = this.modelFor("authenticated.new") as HermesDocumentType[];
    const docType = docTypes.find(
      (_docType) => _docType.name === params.docType
    );

    assert("docType must exist", docType);
    return docType;
  }
}
