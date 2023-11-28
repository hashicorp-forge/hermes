import Controller from "@ember/controller";
import AuthenticatedProductAreasRoute from "hermes/routes/authenticated/product-areas";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProductAreasController extends Controller {
  queryParams = ["product"];
  product = [];

  declare model: ModelFrom<AuthenticatedProductAreasRoute>;
}
