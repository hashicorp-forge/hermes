import Controller from "@ember/controller";
import AuthenticatedDocumentsRoute from "hermes/routes/authenticated/all";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedDocumentsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];

  declare model: ModelFrom<AuthenticatedDocumentsRoute>;
}
