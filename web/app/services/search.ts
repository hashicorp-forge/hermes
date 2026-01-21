import Service from "@ember/service";
import config from "hermes/config/environment";
import { service } from "@ember/service";
import { restartableTask, task } from "ember-concurrency";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { assert } from "@ember/debug";
import ConfigService from "./config";
import {
  FacetDropdownGroups,
  FacetDropdownObjectDetails,
  FacetRecord,
  FacetRecords,
} from "hermes/types/facets";
import SessionService from "./session";
import { SearchScope } from "hermes/routes/authenticated/results";
import { FacetName } from "hermes/components/header/toolbar";
import StoreService from "./_store";

// FIXME: drafts endpoint breaks when you increase this number (to 100, e.g.)
export const HITS_PER_PAGE = 12;
export const MAX_VALUES_PER_FACET = 100;
export const DOC_FACET_NAMES = ["docType", "owners", "product", "status"];
export const PROJECT_FACET_NAMES = ["status"];

/**
 * SearchResponse interface matching the backend response format from /api/v2/search/{index}
 */
export interface SearchResponse<T = unknown> {
  hits: T[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets?: Record<string, Record<string, number>>;
  processingTimeMS?: number;
}

/**
 * SearchForFacetValuesResponse interface for facet value searches
 */
export interface SearchForFacetValuesResponse {
  facetHits: Array<{ value: string; count: number; highlighted: string }>;
}

/**
 * SearchOptions for search requests
 */
export interface SearchOptions {
  facetFilters?: string[][];
  facets?: string[];
  hitsPerPage?: number;
  maxValuesPerFacet?: number;
  page?: number;
  filters?: string;
  optionalFilters?: string | string[];
  attributesToRetrieve?: string[];
}

/**
 * RequestOptions for additional search parameters
 */
export interface RequestOptions {
  [key: string]: unknown;
  q?: string;
  scope?: SearchScope;
  page?: number;
  hitsPerPage?: number;
  filters?: string;
  docType?: string[];
  owners?: string[];
  product?: string[];
  status?: string[];
}

export interface SearchHit {
  objectID: string;
  _highlightResult?: {};
  _snippetResult?: {};
  _rankingInfo?: {};
  _distinctSeqID?: number;
}

export type SearchParams = RequestOptions & SearchOptions;
export type FacetsObject = NonNullable<SearchResponse["facets"]>;

export default class SearchService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare store: StoreService;
  @service declare authenticatedUser: AuthenticatedUserService;

  /**
   * A shorthand getter for the authenticatedUser's email.
   * Returns null if user info is not loaded (e.g., Dex authentication without OIDC flow).
   */
  private get userEmail(): string | null {
    return this.authenticatedUser.info?.email ?? null;
  }

  /**
   * Returns the appropriate authorization header based on the auth provider.
   */
  private getAuthHeaders(): Record<string, string> {
    const authProvider = this.configSvc.config.auth_provider;
    const accessToken = this.session.data.authenticated.access_token;

    if (authProvider === "google") {
      return { "Hermes-Google-Access-Token": accessToken };
    } else if (authProvider === "dex" || authProvider === "okta") {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  }

  /**
   * Returns the default index name for document searches.
   */
  private get defaultIndexName(): string {
    return this.configSvc.config.algolia_docs_index_name;
  }

  /**
   * Performs a search request to the backend API at /api/v2/search/{index}.
   * Transforms SearchOptions to the backend's expected format and transforms
   * the response to match the expected SearchResponse interface.
   */
  private async performSearch<T = unknown>(
    indexName: string,
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResponse<T>> {
    const url = `/api/v2/search/${indexName}`;
    
    // Transform options to backend format
    const body = {
      query: query,
      facetFilters: options.facetFilters || [],
      facets: options.facets || [],
      hitsPerPage: options.hitsPerPage || HITS_PER_PAGE,
      maxValuesPerFacet: options.maxValuesPerFacet || MAX_VALUES_PER_FACET,
      page: options.page || 0,
      filters: options.filters || "",
      optionalFilters: options.optionalFilters || "",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(body),
      credentials: "include", // Include cookies for Dex auth
    });

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform backend response to expected format
    return {
      hits: data.Hits || [],
      nbHits: data.TotalHits || 0,
      page: data.Page || 0,
      nbPages: data.TotalPages || 0,
      hitsPerPage: data.PerPage || HITS_PER_PAGE,
      facets: data.Facets || {},
      processingTimeMS: data.QueryTime || 0,
    };
  }

  /**
   * Iterates over the keys of a facet object and transforms the `count` value
   * into a `FacetDropdownObjectDetails` object with `count` and `selected` properties.
   */
  mapStatefulFacetKeys = (
    facetObject: FacetsObject,
  ): Partial<FacetDropdownGroups> => {
    /**
     * e.g., facetObject === {
     *  owners: {
     *    "meg@hashicorp.com": 10,
     *  },
     *  status: {
     *    Obsolete: 4,
     *    Approved: 6,
     *  }, and so on ...
     * }
     */
    let entries = Object.entries(facetObject).reduce<FacetRecords>(
      (newObj, [key, val]) => {
        /**
         * e.g., `key` === "owners"
         * e.g., `val` === { "meg@hashicorp.com": 10 }
         */
        let newVal: FacetRecord = {};
        let mapper = (count: number) => ({
          count,
          isSelected: false,
        });
        for (let prop in val) {
          /**
           * e.g., prop === "meg@hashicorp.com"
           * e.g., val[prop] === 10
           */
          let valProp = val[prop];
          if (valProp) {
            /**
             * Use the mapper to transform the count into a `FacetDropdownObjectDetails` object:
             * { "meg@hashicorp.com": { count: 10, isSelected: false }}
             */
            newVal[prop] = mapper(valProp);
          }
        }
        newObj[key] = newVal;
        return newObj;
      },
      {},
    );
    /**
     * e.g., entries === {
     *  owners: {
     *   "meg@hashicorp.com": { count: 10, isSelected: false },
     *  },
     *  status: {
     *    Obsolete: { count: 4, isSelected: false },
     *    Approved: { count: 6, isSelected: false },
     *  }, and so on ...
     * }
     */
    return entries;
  };

  /**
   * Iterates over the filter selection and marks corresponding facets "selected"
   */
  markSelected = (facet: FacetRecord, selection?: string[]): void => {
    /**
     * e.g., facet === {
     *  Obsolete: { count: 4, isSelected: false },
     *  Approved: { count: 6, isSelected: false },
     * }
     */
    if (selection) {
      /**
       * e.g., selection === ["Approved"]
       */
      for (let param of selection) {
        const facetParam = facet[param];

        if (facetParam) {
          facetParam.isSelected = true;
        }
      }
      /**
       * e.g., facet["Approved"] === { count: 6, isSelected: true }
       */
    }
  };

  /**
   * Searches an index by query and search params.
   * Returns a search response.
   */
  searchIndex = task(
    async (
      indexName: string,
      query: string,
      params: SearchOptions,
    ): Promise<SearchResponse<unknown>> => {
      return await this.performSearch(indexName, query, params);
    },
  );

  /**
   * Clears the search cache.
   * Called by the dashboard to ensure an up-to-date index.
   * No-op for the new backend-based search (cache handled by backend).
   */
  clearCache = task(async () => {
    // No-op: Backend handles caching
    return;
  });

  /**
   * Returns an array of facet filters based on the current parameters,
   * and whether the owner is looking at their own docs.
   */
  buildFacetFilters(params: SearchParams, userIsOwner = false): string[][] {
    let facets = DOC_FACET_NAMES;

    let facetFilters: string[][] = [];

    // if params.facetFilters is an empty array, it means we're intentionally
    // requesting no facet filters
    if (!(params.facetFilters && params.facetFilters.length === 0)) {
      for (let facet of facets) {
        let facetValues: string[] = [];

        const paramValue = params[facet as keyof RequestOptions];
        if (!paramValue || !Array.isArray(paramValue)) continue;

        for (let val of paramValue) {
          facetValues.push(`${facet}:${val}`);
        }

        if (facetValues.length > 0) {
          facetFilters.push(facetValues);
        }
      }
    }

    if (userIsOwner && this.userEmail) {
      facetFilters.push([`owners:${this.userEmail}`]);
    }
    return facetFilters;
  }

  /**
   * Returns an object for a given ID and an optional indexName.
   * If no match is found, an error is returned.
   * Used by the `RelatedResources` component to find docs from first-party URLs.
   * 
   * Note: This searches for the exact objectID using filters.
   */
  getObject = restartableTask(
    async (objectID: string, indexName?: string): Promise<unknown> => {
      const index = indexName || this.defaultIndexName;
      const response = await this.performSearch(index, "", {
        filters: `objectID:${objectID}`,
        hitsPerPage: 1,
      });
      
      if (response.hits.length === 0) {
        throw new Error(`Object with ID ${objectID} not found in index ${index}`);
      }
      
      return response.hits[0];
    },
  );

  /**
   * Returns a search response for a given query and params.
   * Restarts with every search input keystroke.
   */
  search = restartableTask(
    async (
      query: string,
      params: SearchOptions,
    ): Promise<SearchResponse<unknown> | undefined> => {
      try {
        return await this.performSearch(this.defaultIndexName, query, params);
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );

  /**
   * Returns FacetRecords for a given index and params.
   * Sends a non-faceted query to get the facets of the entire index.
   * (We don't yet scope facets to the current facetFilters.)
   */
  getFacets = task(async (searchIndex: string, params: SearchParams) => {
    const query = params["q"] || "";
    const { scope } = params;

    try {
      const initialFacets =
        scope === SearchScope.Projects ? PROJECT_FACET_NAMES : DOC_FACET_NAMES;

      const searchFacets = await this.searchIndex.perform(searchIndex, query, {
        facets: initialFacets,
        hitsPerPage: HITS_PER_PAGE,
        maxValuesPerFacet: MAX_VALUES_PER_FACET,
        page: 0,
      });

      const facets = this.mapStatefulFacetKeys(
        searchFacets.facets as FacetsObject,
      );

      // Mark facets as selected based on query parameters
      Object.entries(facets).forEach(([name, facet]) => {
        /**
         * e.g., name === "owner"
         * e.g., facet === { "meg@hashicorp.com": { count: 1, isSelected: false }}
         */
        const paramValue = params[name as keyof RequestOptions];
        this.markSelected(facet, Array.isArray(paramValue) ? paramValue : undefined);
      });

      return facets;
    } catch (e) {
      console.error(e);
    }
  });

  /**
   * Returns a SearchResponse for a given index and params.
   * If the user is the owner, i.e., when on the `/my` route,
   * facets will be scoped to the owner's email.
   */
  getDocResults = task(
    async (
      searchIndex: string,
      params: SearchParams,
      userIsOwner = false,
    ): Promise<SearchResponse | unknown> => {
      let query = params["q"] || "";

      try {
        return await this.searchIndex.perform(searchIndex, query, {
          facetFilters: this.buildFacetFilters(params, userIsOwner),
          facets: DOC_FACET_NAMES,
          hitsPerPage: params.hitsPerPage ?? HITS_PER_PAGE,
          maxValuesPerFacet: MAX_VALUES_PER_FACET,
          page: params.page ? params.page - 1 : 0,
          filters: params.filters,
        });
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );

  /**
   * Returns project search results for a given query and params.
   */
  getProjectResults = task(
    async (params: SearchParams): Promise<SearchResponse | unknown> => {
      let query = params["q"] || "";

      try {
        return await this.searchIndex.perform(
          this.configSvc.config.algolia_projects_index_name,
          query,
          {
            facetFilters: this.buildFacetFilters(params),
            hitsPerPage: params.hitsPerPage ?? HITS_PER_PAGE,
            page: params.page ? params.page - 1 : 0,
          },
        );
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );

  /**
   * Searches the values of a given index and facet.
   * Used by the search input to query productAreas.
   * 
   * Note: Implemented by performing a search and filtering facet values by query.
   */
  searchForFacetValues = restartableTask(
    async (
      indexName: string,
      facetName: string,
      query: string,
      params?: RequestOptions,
    ): Promise<SearchForFacetValuesResponse | undefined> => {
      try {
        // Perform a search to get facets
        const searchOptions: SearchOptions = {
          facets: [facetName],
          hitsPerPage: 0, // We only need facets, not hits
          maxValuesPerFacet: MAX_VALUES_PER_FACET,
          ...params,
        };
        
        const results = await this.performSearch(indexName, "", searchOptions);
        
        if (!results.facets || !results.facets[facetName]) {
          return { facetHits: [] };
        }

        // Filter facet values by query and transform to SearchForFacetValuesResponse format
        const facetData = results.facets[facetName];
        const queryLower = query.toLowerCase();
        
        const facetHits = Object.entries(facetData)
          .filter(([value]) => value.toLowerCase().includes(queryLower))
          .map(([value, count]) => ({
            value,
            count,
            highlighted: value, // TODO: Could add highlighting here
          }))
          .sort((a, b) => b.count - a.count);

        if (facetName === FacetName.Owners) {
          await this.store.maybeFetchPeople.perform(
            facetHits.map((hit: { value: string }) => hit.value),
          );
        }

        return { facetHits };
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );
}
