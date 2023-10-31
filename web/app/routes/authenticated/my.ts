import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { AlgoliaFacetsObject } from "hermes/services/algolia";
import RouterService from "@ember/routing/router-service";
import { HermesDocument } from "hermes/types/document";

export interface DraftResponseJSON {
  facets: AlgoliaFacetsObject;
  Hits: HermesDocument[];
  params: string;
  page: number;
  nbPages: number;
}

export default class AuthenticatedMyRoute extends Route {
  @service declare router: RouterService;
}
