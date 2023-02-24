import Controller from "@ember/controller";
import { DraftResponseJSON } from "hermes/routes/authenticated/drafts";
import { FacetDropdownGroups } from "hermes/types/facets";

export default class AuthenticatedDraftsController extends Controller {
  declare model: {
    facets: FacetDropdownGroups;
    results: DraftResponseJSON;
  };
  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  page = 1;
  owners = [];
  product = [];
  sortBy = "dateDesc";
  status = [];
}
