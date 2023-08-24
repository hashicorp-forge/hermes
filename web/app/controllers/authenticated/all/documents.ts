import Controller from "@ember/controller";

export default class AuthenticatedAllDocumentsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];
}
