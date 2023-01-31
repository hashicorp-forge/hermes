import Controller from "@ember/controller";

export default class AuthenticatedDraftsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  page = 1;
  owners = [];
  product = [];
  sortBy = "dateDesc";
  status = [];
}
