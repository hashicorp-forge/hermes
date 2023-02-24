import Controller from "@ember/controller";
import { HermesDocument } from "hermes/types/document";
import { FacetDropdownGroups } from "hermes/types/facets";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedAllController extends Controller {
  declare model: {
    facets: FacetDropdownGroups;
    results: SearchResponse<HermesDocument>;
  };

  queryParams = ["docType", "owners", "page", "product", "sortBy", "status"];
  docType = [];
  owners = [];
  page = 1;
  product = [];
  sortBy = "dateDesc";
  status = [];
}
