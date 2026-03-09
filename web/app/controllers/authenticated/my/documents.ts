import Controller from "@ember/controller";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import type AuthenticatedMyDocumentsRoute from "hermes/routes/authenticated/my/documents";
import type { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedMyDocumentsController extends Controller {
  queryParams = ["includeSharedDrafts", "page", "sortBy", "showArchivedDrafts"];
  includeSharedDrafts = true;
  page = 1;
  sortBy = SortByValue.DateDesc;
  showArchivedDrafts = false;

  declare model: ModelFrom<AuthenticatedMyDocumentsRoute>;

  get sortDirection() {
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
