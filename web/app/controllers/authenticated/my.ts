import Controller from "@ember/controller";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import AuthenticatedMyRoute from "hermes/routes/authenticated/my";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedDocumentsController extends Controller {
  queryParams = ["excludeSharedDrafts", "page", "sortBy"];
  excludeSharedDrafts = false;
  page = 1;
  sortBy = SortByValue.DateDesc;

  declare model: ModelFrom<AuthenticatedMyRoute>;

  get sortDirection() {
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
