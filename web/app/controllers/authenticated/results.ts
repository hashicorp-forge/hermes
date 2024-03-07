import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import AuthenticatedResultsRoute, {
  SearchScope,
} from "hermes/routes/authenticated/results";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedResultsController extends Controller {
  queryParams = ["page", "q", "scope", "docType", "owners", "product"];

  q: string | null = null;
  page = 1;
  docType = [];
  owners = [];
  product = [];
  status = [];

  @tracked scope = SearchScope.All;

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

  /**
   * The facets, depending on the current scope.
   * Passed to the template in a Glint-friendly format.
   */
  protected get facets() {
    const { docFacets, projectFacets } = this.model;

    switch (this.scope) {
      case SearchScope.Docs:
        return docFacets;
      case SearchScope.Projects:
        return projectFacets;
    }
  }
}
