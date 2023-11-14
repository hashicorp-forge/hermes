import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService, { AlgoliaFacetsObject } from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import { SearchOptions, SearchResponse } from "instantsearch.js";
import { HermesDocument } from "hermes/types/document";
import { createDraftURLSearchParams } from "hermes/utils/create-draft-url-search-params";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import Transition from "@ember/routing/transition";

export interface DraftResponseJSON {
  facets: AlgoliaFacetsObject;
  Hits: HermesDocument[];
  params: string;
  page: number;
  nbPages: number;
}

interface AuthenticatedMyDocumentsRouteParams {
  page?: number;
  sortBy?: SortByValue;
  excludeSharedDrafts?: boolean;
}

export default class AuthenticatedMyDocumentsRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: FlashMessageService;

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
    async (options: SearchOptions): Promise<DraftResponseJSON | undefined> => {
      try {
        return await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/drafts?` +
              createDraftURLSearchParams({
                ...options,
                ownerEmail: this.authenticatedUser.info.email,
              }),
          )
          .then((response) => response?.json());
      } catch (e: unknown) {
        this.flashMessages.add({
          title: "Failed to fetch draft documents",
          message: (e as Error).message,
          type: "critical",
        });
      }
    },
  );

  async model(params: AuthenticatedMyDocumentsRouteParams) {
    const sortedBy = params.sortBy ?? SortByValue.DateDesc;
    const sortDirection =
      params.sortBy === SortByValue.DateAsc
        ? SortDirection.Asc
        : SortDirection.Desc;
    const indexName = this.configSvc.config.algolia_docs_index_name;
    const { page } = params;

    // TODO: need to create modifiedTime_asc indexes
    // TODO: need to allow filtering on this index (maybe)
    const searchIndex = `${indexName}_modifiedTime_${sortDirection}`;

    let [draftResults, docResults] = await Promise.all([
      this.getDraftResults.perform({
        hitsPerPage: 100,
        page,
      }),
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

    const nbPages = Math.max(
      typedDocResults.nbPages,
      draftResults?.nbPages ?? 1,
    );

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
      nbPages,
    };
  }
}
