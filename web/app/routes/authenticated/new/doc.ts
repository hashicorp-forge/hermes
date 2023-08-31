import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import RSVP from "rsvp";

export default class AuthenticatedNewDocRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model() {
    const documentTypes = this.fetchSvc
      .fetch("/api/v1/document-types")
      .then((response) => response?.json());

    const productAreas = this.fetchSvc
      .fetch("/api/v1/products")
      .then((response) => response?.json());

    return RSVP.hash({
      documentTypes,
      productAreas,
    });
  }
}
