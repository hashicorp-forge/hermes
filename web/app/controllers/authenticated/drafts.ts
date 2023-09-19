import Controller from "@ember/controller";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import AuthenticatedDraftsRoute from "hermes/routes/authenticated/drafts";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedDraftsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  page = 1;
  owners = [];
  product = [];
  sortBy = "dateDesc";
  status = [];

  declare model: ModelFrom<AuthenticatedDraftsRoute>;

  get sortDirection() {
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
