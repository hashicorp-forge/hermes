import Controller from "@ember/controller";

export default class AuthenticatedMyController extends Controller {
  queryParams = ["docType", "owners", "page", "product","team","project", "sortBy", "status"];
  docType = [];
  page = 1;
  owners = [];
  product = [];
  team = [];
  project = [];
  sortBy = "dateDesc";
  status = [];
}
