import Controller from "@ember/controller";
import type AuthenticatedNewDocRoute from "hermes/routes/authenticated/new/doc";
import type { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedNewDocController extends Controller {
  queryParams = ["docType"];

  declare model: ModelFrom<AuthenticatedNewDocRoute>;
}
