import Controller from "@ember/controller";

export default class AuthenticatedResultsController extends Controller {
  queryParams = ["docType", "owners", "page", "product","team","project", "q", "status"];

  docType = [];
  page = 1;
  q = null;
  owners = [];
  product = [];
  team = [];
  project = [];
  status = [];
}
