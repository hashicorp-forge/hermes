import Controller from "@ember/controller";
import { HermesDocument } from "hermes/types/document";
import { FacetDropdownGroups } from "hermes/types/facets";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedResultsController extends Controller {
  declare model: {
    facets: FacetDropdownGroups;
    results: SearchResponse<HermesDocument>;
  };

  queryParams = ["docType", "owners", "page", "product", "q", "status"];
  docType = [];
  page = 1;
  q = null;
  owners = [];
  product = [];
  status = [];
}
