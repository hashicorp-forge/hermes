import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";

export enum SearchScope {
  All = "all",
  Docs = "docs",
  Projects = "projects",
}

export default class AuthenticatedResultsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
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
      ? this.algolia.searchForFacetValues.perform(
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
      : this.algolia.getFacets.perform(docsIndex, params);

    let docResultsPromise = scopeIsProjects
      ? undefined
      : this.algolia.getDocResults.perform(docsIndex, params);

    let projectFacetsPromise = scopeIsDocs
      ? undefined
      : this.algolia.getFacets.perform(projectsIndex, params);

    let projectResultsPromise = scopeIsDocs
      ? undefined
      : this.algolia.getProjectResults.perform(params);

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

    if (docResults) {
      const docHits = (docResults as { hits?: HermesDocument[] }).hits;

      if (docHits) {
        // Load owner information
        await this.store.maybeFetchPeople.perform(docHits);
      }
    }

    this.activeFilters.update(params);

    return {
      docFacets,
      docResults,
      projectFacets,
      projectResults,
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
