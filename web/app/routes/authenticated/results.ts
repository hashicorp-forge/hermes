import Route from "@ember/routing/route";
import { service } from "@ember/service";
import SearchService from "hermes/services/search";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";
import { HermesProject, HermesProjectHit } from "hermes/types/project";
import { SearchResponse } from "instantsearch.js";
import FetchService from "hermes/services/fetch";

export enum SearchScope {
  All = "All",
  Docs = "Docs",
  Projects = "Projects",
}

export default class AuthenticatedResultsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare search: SearchService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare store: StoreService;

  queryParams = {
    page: {
      refreshModel: true,
    },
    q: {
      refreshModel: true,
    },
    scope: {
      refreshModel: true,
    },
    docType: {
      refreshModel: true,
    },
    owners: {
      refreshModel: true,
    },
    product: {
      refreshModel: true,
    },
    status: {
      refreshModel: true,
    },
  };

  async model(params: ResultsRouteParams) {
    const { scope } = params;

    const docsIndex = this.configSvc.config.algolia_docs_index_name;
    const projectsIndex = this.configSvc.config.algolia_projects_index_name;

    const scopeIsAll = scope === SearchScope.All;
    const scopeIsProjects = scope === SearchScope.Projects;
    const scopeIsDocs = scope === SearchScope.Docs;

    const productResultsPromise = scopeIsAll
      ? this.search.searchForFacetValues.perform(
          this.configSvc.config.algolia_docs_index_name,
          "product",
          params.q,
          {
            hitsPerPage: 1,
          },
        )
      : undefined;
    let docFacetsPromise = scopeIsProjects
      ? undefined
      : this.search.getFacets.perform(docsIndex, params);

    let docResultsPromise = scopeIsProjects
      ? undefined
      : this.search.getDocResults.perform(docsIndex, params);

    let projectFacetsPromise = scopeIsDocs
      ? undefined
      : this.search.getFacets.perform(projectsIndex, params);

    let projectResultsPromise = scopeIsDocs
      ? undefined
      : this.search.getProjectResults.perform(params);
    const [
      docFacets,
      docResults,
      projectFacets,
      projectResults,
      productResults,
    ] = await Promise.all([
      docFacetsPromise,
      docResultsPromise,
      projectFacetsPromise,
      projectResultsPromise,
      productResultsPromise,
    ]);

    const typedDocResults = docResults as SearchResponse<HermesDocument>;
    let typedProjectResults = projectResults as SearchResponse<HermesProject>;

    if (docResults) {
      const docHits = typedDocResults.hits;

      if (docHits) {
        // Load owner information
        await this.store.maybeFetchPeople.perform(docHits);
      }
    }

    if (projectResults) {
      let { hits } = typedProjectResults;

      if (hits) {
        /**
         * Replace the hits with the full project models
         */
        typedProjectResults.hits = await Promise.all(
          hits.map(
            async (hit: HermesProjectHit) =>
              await this.fetchSvc
                .fetch(
                  `/api/${this.configSvc.config.api_version}/projects/${hit.objectID}`,
                )
                .then((resp) => resp?.json()),
          ),
        );
      }
    }

    this.activeFilters.update(params);

    return {
      docFacets,
      docResults: typedDocResults,
      projectFacets,
      projectResults: typedProjectResults,
      productResults,
    };
  }

  /**
   * The actions to run when the route is deactivated.
   * Resets the active filters for the next time the route is activated.
   */
  deactivate() {
    this.activeFilters.reset();
  }
}
