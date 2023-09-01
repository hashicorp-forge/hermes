import Controller from "@ember/controller";

/**
 * This allows queryParams to be captured and passed
 * to the `/documents` route on redirect.
 */

export default class AuthenticatedAllController extends Controller {
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];
}
