import Controller from "@ember/controller";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import AuthenticatedAllDocumentsRoute from "hermes/routes/authenticated/all/documents";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedAllDocumentsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];

  declare model: ModelFrom<AuthenticatedAllDocumentsRoute>;

  get sortDirection() {
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
