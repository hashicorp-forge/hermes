import Controller from "@ember/controller";

export default class AuthenticatedResultsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "q", "status"];

  docType = [];
  page = 1;
  q = null;
  owners = [];
  product = [];
  status = [];
}
