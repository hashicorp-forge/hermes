import Controller from "@ember/controller";
import { SearchScope } from "hermes/routes/authenticated/results";

export default class AuthenticatedResultsController extends Controller {
  queryParams = ["page", "q", "scope"];

  page = 1;
  q = null;
  scope = SearchScope.All;
}
