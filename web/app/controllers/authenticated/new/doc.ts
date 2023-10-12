import Controller from "@ember/controller";
import AuthenticatedNewDocRoute from "hermes/routes/authenticated/new/doc";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedNewDocController extends Controller {
  queryParams = ["docType"];

  declare model: ModelFrom<AuthenticatedNewDocRoute>;
}
