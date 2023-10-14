import Controller from "@ember/controller";
import AuthenticatedMyRoute from "hermes/routes/authenticated/my";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedMyController extends Controller {
  declare model: ModelFrom<AuthenticatedMyRoute>;
}
