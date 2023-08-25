import Controller from "@ember/controller";
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
}
