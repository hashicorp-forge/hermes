import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import type { AlgoliaFacetsObject } from "hermes/services/algolia";
import type AlgoliaService from "hermes/services/algolia";
import type ConfigService from "hermes/services/config";
import type FetchService from "hermes/services/fetch";
import type AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import type { SearchOptions, SearchResponse } from "@algolia/client-search";
import type { HermesDocument } from "hermes/types/document";
import { createDraftURLSearchParams } from "hermes/utils/create-draft-url-search-params";
import { SortByValue } from "hermes/components/header/toolbar";
import { SortDirection } from "hermes/components/table/sortable-header";
import type FlashMessageService from "ember-cli-flash/services/flash-messages";
import type StoreService from "hermes/services/store";

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
  includeSharedDrafts?: boolean;
  showArchivedDrafts?: boolean;
}

export default class AuthenticatedMyDocumentsRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: FlashMessageService;
  @service declare store: StoreService;

  queryParams = {
    includeSharedDrafts: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
    sortBy: {
      refreshModel: true,
    },
    showArchivedDrafts: {
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
      sortedBy === SortByValue.DateDesc
        ? SortDirection.Desc
        : SortDirection.Asc;

    const indexName = this.configSvc.config.algolia_docs_index_name;
    const { page } = params;
    const searchIndex = `${indexName}_modifiedTime_${sortDirection}`;
    const sortIsDesc = sortDirection === SortDirection.Desc;

    // Determine facet filters for drafts based on owner toggle
    // Don't filter by archived status here - we'll do that client-side
    const ownerFilter = params.includeSharedDrafts === false
      ? [`owners:${this.authenticatedUser.info.email}`]
      : undefined;

    let [draftResults, docResults] = await Promise.all([
      this.getDraftResults.perform({
        hitsPerPage: 100,
        page,
        facetFilters: ownerFilter,
      }),
      // Only fetch published docs when not showing archived drafts
      params.showArchivedDrafts === true
        ? Promise.resolve({ hits: [], nbPages: 0 })
        : this.algolia.getDocResults.perform(
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

    // Filter drafts based on archived status (client-side)
    let filteredDrafts = draftResults?.Hits ?? [];
    if (params.showArchivedDrafts === true) {
      // Show only archived drafts
      filteredDrafts = filteredDrafts.filter(draft => draft.archived === true);
    } else {
      // Show only non-archived drafts (including those without archived field)
      filteredDrafts = filteredDrafts.filter(draft => draft.archived !== true);
    }

    let docs = [...filteredDrafts, ...(typedDocResults.hits ?? [])];

    docs = docs.sort((a, b) => {
      const aTime = a.modifiedTime ?? 0;
      const bTime = b.modifiedTime ?? 0;
      // In our case we want the highest (more recent) number first
      if (sortIsDesc) {
        return bTime - aTime;
      } else {
        return aTime - bTime;
      }
    });

    // load owner information
    await this.store.maybeFetchPeople.perform(docs);

    return {
      docs,
      sortedBy,
      currentPage: page ?? 1,
      nbPages,
      includeSharedDrafts: params.includeSharedDrafts ?? true,
      showArchivedDrafts: params.showArchivedDrafts ?? false,
    };
  }
}
