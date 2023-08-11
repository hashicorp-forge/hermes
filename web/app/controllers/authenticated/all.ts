import Controller from "@ember/controller";

export default class AuthenticatedAllController extends Controller {
  queryParams = ["docType", "owners", "page", "product","team","project","sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  team = [];
  project = [];
  sortBy = "dateDesc";
  status = [];
}
