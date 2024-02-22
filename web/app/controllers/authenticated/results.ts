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

  page = 1;
  q = "";
  scope = SearchScope.All;
  docType = "";
  owners = [];
  product = [];
  status = [];

  declare model: ModelFrom<AuthenticatedResultsRoute>;

  protected get allScope() {
    return SearchScope.All;
  }

  protected get docsScope() {
    return SearchScope.Docs;
  }

  protected get projectsScope() {
    return SearchScope.Projects;
  }
}
