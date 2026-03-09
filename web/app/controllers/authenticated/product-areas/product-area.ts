import Controller from "@ember/controller";
import type AuthenticatedProductAreasProductAreaRoute from "hermes/routes/authenticated/product-areas/product-area";
import type { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProductAreasProductAreaController extends Controller {
  queryParams = ["product"];
  product = [];

  declare model: ModelFrom<AuthenticatedProductAreasProductAreaRoute>;
}
