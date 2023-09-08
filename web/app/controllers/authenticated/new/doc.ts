import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import AuthenticatedNewDocRoute from "hermes/routes/authenticated/new/doc";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedNewDocController extends Controller {
  @service declare router: RouterService;

  queryParams = ["docType"];

  declare model: ModelFrom<AuthenticatedNewDocRoute>;
}
