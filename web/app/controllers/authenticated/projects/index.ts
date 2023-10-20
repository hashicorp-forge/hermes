import Controller from "@ember/controller";
import AuthenticatedProjectsIndexRoute from "hermes/routes/authenticated/projects/index";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProjectsController extends Controller {
  declare model: ModelFrom<AuthenticatedProjectsIndexRoute>;
}
