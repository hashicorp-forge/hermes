import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";

export default class AuthenticatedAllController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];

  @tracked docType = [];
  @tracked owners = [];
  @tracked product = [];
  @tracked status = [];

  page = 1;
  sortBy = "dateDesc";
}
