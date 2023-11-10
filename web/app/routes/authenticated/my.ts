import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService, { AlgoliaFacetsObject } from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import { SearchResponse } from "instantsearch.js";
import { HermesDocument } from "hermes/types/document";
import { createDraftURLSearchParams } from "hermes/utils/create-draft-url-search-params";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";

export interface DraftResponseJSON {
  facets: AlgoliaFacetsObject;
  Hits: HermesDocument[];
  params: string;
  page: number;
  nbPages: number;
}

interface AuthenticatedMyRouteParams {
  page?: number;
  sortBy?: SortByValue;
  excludeSharedDrafts?: boolean;
}

export default class AuthenticatedMyRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  queryParams = {
    excludeSharedDrafts: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
    sortBy: {
      refreshModel: true,
    },
  };

  /**
   * Fetches draft doc information based on searchParams and the current user.
   */
  private getDraftResults = task(
    async (): Promise<DraftResponseJSON | undefined> => {
      try {
        console.log(
          "draftURLSearchParams",
          createDraftURLSearchParams(this.authenticatedUser.info.email),
        );
        let response = await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/drafts?` +
              createDraftURLSearchParams(this.authenticatedUser.info.email),
          )
          .then((response) => response?.json());
        return response;
      } catch (e: unknown) {
        // TODO: handle error
        console.error(e);
      }
    },
  );

  async model(params: AuthenticatedMyRouteParams) {
    const sortedBy = params.sortBy ?? SortByValue.DateDesc;
    const sortDirection =
      params.sortBy === SortByValue.DateAsc
        ? SortDirection.Asc
        : SortDirection.Desc;
    const indexName = this.configSvc.config.algolia_docs_index_name;
    const { page } = params;

    // TODO: need to create modifiedTime_asc indexes
    //TODO: need to allow filtering on this index
    const searchIndex = `${indexName}_modifiedTime_${sortDirection}`;

    console.log("page", page);

    let [draftResults, docResults] = await Promise.all([
      this.getDraftResults.perform(),
      this.algolia.getDocResults.perform(
        searchIndex,
        {
          hitsPerPage: 100,
          page,
          facetFilters: [],
        },
        true,
      ),
    ]);

    const typedDocResults = docResults as SearchResponse<HermesDocument>;

    const docs = [
      ...(draftResults?.Hits ?? []),
      ...(typedDocResults.hits ?? []),
    ].sort((a, b) => {
      if (a.modifiedTime && b.modifiedTime) {
        return b.modifiedTime - a.modifiedTime;
      } else {
        // if one has modifiedTime and the other doesn't,
        // the one with the modifiedTime is newer
        return a.modifiedTime ? -1 : 1;
      }
    });

    return {
      docs,
      sortedBy,
      currentPage: page ?? 1,
      nbPages: typedDocResults.nbPages,
    };
  }
}
