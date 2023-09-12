import Controller from "@ember/controller";
import AuthenticatedResultsRoute from "hermes/routes/authenticated/results";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedResultsController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "q", "status"];

  docType = [];
  page = 1;
  q = "";
  owners = [];
  product = [];
  status = [];

  declare model: ModelFrom<AuthenticatedResultsRoute>;
}
