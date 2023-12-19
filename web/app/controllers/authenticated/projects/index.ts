import Controller from "@ember/controller";
import AuthenticatedProjectsIndexRoute from "hermes/routes/authenticated/projects/index";
import { ProjectStatus } from "hermes/types/project-status";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProjectsController extends Controller {
  queryParams = ["status"];

  /**
   * Because every Projects view is filtered, we set a param
   * so that the default tab's URL is "/projects" and not
   * "/projects?status=active"
   */
  status = ProjectStatus.Active;

  declare model: ModelFrom<AuthenticatedProjectsIndexRoute>;
}
