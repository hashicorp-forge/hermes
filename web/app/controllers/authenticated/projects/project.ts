import Controller from "@ember/controller";
import AuthenticatedProjectsIndexRoute from "hermes/routes/authenticated/projects/index";
import AuthenticatedProjectsProjectRoute from "hermes/routes/authenticated/projects/project";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProjectsProjectController extends Controller {
  declare model: ModelFrom<AuthenticatedProjectsProjectRoute>;
}
