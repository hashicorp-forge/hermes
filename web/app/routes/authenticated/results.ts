import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";

export default class ResultsRoute extends Route {
  @service declare algolia: AlgoliaService;
  @service("config") declare configSvc: ConfigService;

  queryParams = {
    docType: {
      refreshModel: true,
    },
    owners: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
    product: {
      refreshModel: true,
    },
    status: {
      refreshModel: true,
    },
    q: {
      refreshModel: true,
    },
  };

  async model(params: ResultsRouteParams) {
    const searchIndex = this.configSvc.config.algolia_docs_index_name;

    return RSVP.hash({
      facets: this.algolia.getFacets.perform(searchIndex, params),
      results: this.algolia.getDocResults.perform(searchIndex, params),
    });
  }
}
