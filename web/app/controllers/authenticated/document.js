import Controller from "@ember/controller";

export default class AuthenticatedDocumentController extends Controller {
  queryParams = ["draft"];
  draft = false;
}
