import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/my-docs";

export default class AuthenticatedAllController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];

  get sortDirection() {
    // this is now referencing the model?
    // @ts-ignore
    console.log("sortedby", this.model.sortedBy);
    // @ts-ignore
    switch (this.model.sortedBy) {
      case SortByValue.DateAsc:
        return SortDirection.Asc;
      default:
        return SortDirection.Desc;
    }
  }
}
