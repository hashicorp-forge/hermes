import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";

export default class AuthenticatedNewDocRoute extends Route {
  @service("fetch") fetchSvc;
  @service flashMessages;
  @service router;

  queryParams = {
    docType: {
      refreshModel: true,
    },
  };

  async model(params) {
    // Validate docType.
    switch (params.docType) {
      case "FRD":
      case "PRD":
      case "RFC":
        break;
      default:
        this.flashMessages.add({
          message: `Invalid document type: ${params.docType}`,
          title: "Invalid document type",
          type: "critical",
          timeout: 7000,
          extendedTimeout: 1000,
        });
        this.router.transitionTo("authenticated.new");
    }

    return RSVP.hash({
      docType: params?.docType,
    });
  }
}
