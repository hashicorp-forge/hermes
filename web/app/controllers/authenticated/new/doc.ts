import Controller from "@ember/controller";
import AuthenticatedNewDocumentRoute from "hermes/routes/authenticated/new/document";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedNewDocController extends Controller {
  queryParams = ["docType"];

  declare model: ModelFrom<AuthenticatedNewDocumentRoute>;
}
