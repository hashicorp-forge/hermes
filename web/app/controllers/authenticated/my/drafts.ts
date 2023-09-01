import Controller from "@ember/controller";
import AuthenticatedMyDraftsRoute from "hermes/routes/authenticated/my/drafts";
import { ModelFrom } from "hermes/types/route-models";
import { SortDirection } from "hermes/components/table/sortable-header";
import { SortByValue } from "hermes/components/header/toolbar";

export default class AuthenticatedMyDraftsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];

  declare model: ModelFrom<AuthenticatedMyDraftsRoute>;

  get sortDirection() {
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
