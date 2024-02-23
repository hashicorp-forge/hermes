import Controller from "@ember/controller";
import AuthenticatedResultsRoute, {
  SearchScope,
} from "hermes/routes/authenticated/results";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedResultsController extends Controller {
  queryParams = [
    "page",
    "q",
    "scope",
    "docType",
    "owners",
    "product",
    "status",
    // and whatever project filters there are
  ];

  q = null;
  page = 1;
  scope = SearchScope.All;
  docType = [];
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
