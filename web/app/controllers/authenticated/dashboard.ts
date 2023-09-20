import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RecentlyViewedDocsService from "hermes/services/recently-viewed-docs";
import { HermesDocument } from "hermes/types/document";

export default class AuthenticatedDashboardController extends Controller {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service("recently-viewed-docs")
  declare recentDocs: RecentlyViewedDocsService;

  declare model: HermesDocument[];
}
