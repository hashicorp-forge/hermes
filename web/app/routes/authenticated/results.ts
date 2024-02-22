import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";
import { FacetRecords } from "hermes/types/facets";
import { SearchResponse } from "instantsearch.js";
import { HermesProject } from "hermes/types/project";
import { TaskInstance } from "ember-concurrency";

export enum SearchScope {
  All = "all",
  Docs = "docs",
  Projects = "projects",
}

export default class ResultsRoute extends Route {
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

    let docFacetsPromise: Promise<FacetRecords | undefined> | undefined =
      this.algolia.getFacets.perform(docsIndex, params);

    let docResultsPromise:
      | Promise<SearchResponse<HermesDocument | undefined>>
      | undefined = this.algolia.getDocResults.perform(docsIndex, params);

    let projectFacetsPromise: Promise<FacetRecords | undefined> | undefined =
      this.algolia.getFacets.perform(projectsIndex, params);

    let projectResultsPromise:
      | Promise<SearchResponse<HermesProject | undefined>>
      | undefined = this.algolia.getProjectResults.perform(params);

    switch (scope) {
      case SearchScope.Docs:
        console.log("settings projects undefined");
        projectFacetsPromise = undefined;
        projectResultsPromise = undefined;
        break;
      case SearchScope.Projects:
        docFacetsPromise = undefined;
        docResultsPromise = undefined;
        break;
    }

    console.log("bout to fetch");

    const [docFacets, docResults, projectFacets, projectResults] =
      await Promise.all([
        docFacetsPromise,
        docResultsPromise,
        projectFacetsPromise,
        projectResultsPromise,
      ]);

    if (docResults) {
      const docHits = (docResults as { hits?: HermesDocument[] }).hits;

      if (docHits) {
        // Load owner information
        await this.store.maybeFetchPeople.perform(docHits);
      }
    }

    this.activeFilters.update(params);

    console.log("third dollar", {
      docFacets,
      docResults,
      projectFacets,
      projectResults,
    });

    return { docFacets, docResults, projectFacets, projectResults };
  }
}
