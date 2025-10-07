import Controller from "@ember/controller";
import { service } from "@ember/service";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import AuthenticatedDocumentsRoute from "hermes/routes/authenticated/documents";
import ActiveFiltersService from "hermes/services/active-filters";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedDocumentsController extends Controller {
  // Used in the template to conditionally render a resultCount headline
  @service declare activeFilters: ActiveFiltersService;

  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];

  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = SortByValue.DateDesc;
  status = [];

  declare model: ModelFrom<AuthenticatedDocumentsRoute>;

  get sortDirection() {
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
