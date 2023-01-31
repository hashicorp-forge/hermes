import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class AuthenticatedNewDocController extends Controller {
  @service router;

  queryParams = ["docType"];


}
