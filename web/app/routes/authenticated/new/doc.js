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
    return RSVP.hash({
      docType: params?.docType,
    });
  }
}
