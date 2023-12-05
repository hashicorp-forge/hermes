import Controller from "@ember/controller";
import AuthenticatedProjectsIndexRoute from "hermes/routes/authenticated/projects/index";
import { ProjectStatus } from "hermes/types/project-status";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProjectsController extends Controller {
  queryParams = ["status"];

  status = ProjectStatus.Active;

  declare model: ModelFrom<AuthenticatedProjectsIndexRoute>;
}
