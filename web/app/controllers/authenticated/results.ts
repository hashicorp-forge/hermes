import Controller from "@ember/controller";
import AuthenticatedResultsRoute from "hermes/routes/authenticated/results";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedResultsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "q", "status"];

  docType = [];
  page = 1;
  q = null;
  owners = [];
  product = [];
  status = [];

  declare model: ModelFrom<AuthenticatedResultsRoute>;

  /**
   * The value to use for the page title.
   * If a query is present, which it usually is,
   * it's prepended to the title.
   */
  protected get pageTitle() {
    let title = "Search";

    if (this.q) {
      title = `${this.q} • ${title}`;
    }

    return title;
  }
}
