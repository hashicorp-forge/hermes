import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import FetchService from "../../../services/fetch";

export default class AuthenticatedDashboardController extends Controller {
  @service authenticatedUser;
  @service("fetch") fetchSvc: FetchService;
}
