import Service from "@ember/service";
import algoliaSearch, { SearchClient, SearchIndex } from "algoliasearch";
import { SearchForFacetValuesResponse } from "@algolia/client-search";
import config from "hermes/config/environment";
import { service } from "@ember/service";
import { restartableTask, task } from "ember-concurrency";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { RequestOptions } from "@algolia/transporter";
import { SearchOptions, SearchResponse } from "@algolia/client-search";
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

export interface AlgoliaHit {
  objectID: string;
  _highlightResult?: {};
  _snippetResult?: {};
  _rankingInfo?: {};
  _distinctSeqID?: number;
}

export type AlgoliaSearchParams = RequestOptions & SearchOptions;
export type AlgoliaFacetsObject = NonNullable<SearchResponse["facets"]>;

export default class AlgoliaService extends Service {
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
   * Cached Algolia SearchClient instance.
   * Created lazily to ensure auth provider config is loaded.
   */
  private _client?: SearchClient;

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
   * Returns an Algolia SearchClient configured to proxy all requests through the backend.
   * This ensures all search operations go through the Hermes API at /1/indexes/*
   * rather than directly to Algolia's infrastructure.
   * 
   * The client is created lazily to ensure the auth provider configuration
   * is loaded from the backend before setting up auth headers.
   */
  private get client(): SearchClient {
    if (!this._client) {
      const protocol =
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost"
          ? "http"
          : "https";

      const authProvider = this.configSvc.config.auth_provider;
      console.log(
        `Algolia client configured to proxy all requests through Hermes backend (${authProvider} auth) at ${protocol}://${window.location.hostname}:${window.location.port}/1/indexes/*`,
      );

      // Create client with auth headers that update dynamically
      this._client = algoliaSearch("", "", {
        headers: this.getAuthHeaders(),
        hosts: [
          {
            protocol: protocol,
            url: window.location.hostname + ":" + window.location.port,
          },
        ],
      });
    }
    return this._client;
  }

  /**
   * An Algolia SearchIndex scoped to the environment.
   */
  private get index(): SearchIndex {
    return this.client.initIndex(this.configSvc.config.algolia_docs_index_name);
  }

  /**
   * Iterates over the keys of a facet object and transforms the `count` value
   * into a `FacetDropdownObjectDetails` object with `count` and `selected` properties.
   */
  mapStatefulFacetKeys = (
    facetObject: AlgoliaFacetsObject,
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
   * Returns an Algolia SearchResponse.
   */
  searchIndex = task(
    async (
      indexName: string,
      query: string,
      params: AlgoliaSearchParams,
    ): Promise<SearchResponse<unknown>> => {
      let index: SearchIndex = this.client.initIndex(indexName);
      return await index.search(query, params);
    },
  );

  /**
   * Clears Algolia's cache.
   * Called by the dashboard to ensure an up-to-date index.
   */
  clearCache = task(async () => {
    await this.client.clearCache();
  });

  /**
   * Returns an array of facet filters based on the current parameters,
   * and whether the owner is looking at their own docs.
   */
  buildFacetFilters(params: AlgoliaSearchParams, userIsOwner = false) {
    let facets = DOC_FACET_NAMES;

    let facetFilters = [];

    // if params.facetFilters is an empty array, it means we're intentionally
    // requesting no facet filters
    if (!(params.facetFilters && params.facetFilters.length === 0)) {
      for (let facet of facets) {
        let facetValues = [];

        if (!params[facet]) continue;

        for (let val of params[facet]) {
          facetValues.push(`${facet}:${val}`);
        }

        if (facetValues.length > 0) {
          facetFilters.push(facetValues);
        }
      }
    }

    if (userIsOwner && this.userEmail) {
      facetFilters.push(`owners:${this.userEmail}`);
    }
    return facetFilters;
  }

  /**
   * Returns an object for a given ID and an optional indexName.
   * If no match is found, an error is returned.
   * Used by the `RelatedResources` component to find docs from first-party URLs.
   *
   * https://www.algolia.com/doc/api-reference/api-methods/get-objects/
   */
  getObject = restartableTask(
    async (objectID: string, indexName?: string): Promise<unknown> => {
      const index = indexName ? this.client.initIndex(indexName) : this.index;
      return await index.getObject(objectID);
    },
  );

  /**
   * Returns a search response for a given query and params.
   * Restarts with every search input keystroke.
   */
  search = restartableTask(
    async (
      query: string,
      params,
    ): Promise<SearchResponse<unknown> | undefined> => {
      try {
        return await this.index
          .search(query, params)
          .then((response) => response);
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );

  /**
   * Returns FacetRecords for a given index and params.
   * Sends a non-faceted query to Algolia to get the facets of the entire index.
   * (We don't yet scope facets to the current facetFilters.)
   */
  getFacets = task(async (searchIndex: string, params: AlgoliaSearchParams) => {
    const query = params["q"] || "";
    const { scope } = params;

    try {
      const initialFacets =
        scope === SearchScope.Projects ? PROJECT_FACET_NAMES : DOC_FACET_NAMES;

      const algoliaFacets = await this.searchIndex.perform(searchIndex, query, {
        facets: initialFacets,
        hitsPerPage: HITS_PER_PAGE,
        maxValuesPerFacet: MAX_VALUES_PER_FACET,
        page: 0,
      });

      const facets = this.mapStatefulFacetKeys(
        algoliaFacets.facets as AlgoliaFacetsObject,
      );

      // Mark facets as selected based on query parameters
      Object.entries(facets).forEach(([name, facet]) => {
        /**
         * e.g., name === "owner"
         * e.g., facet === { "meg@hashicorp.com": { count: 1, isSelected: false }}
         */
        this.markSelected(facet, params[name]);
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
      params: AlgoliaSearchParams,
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
   *
   */
  getProjectResults = task(
    async (params: AlgoliaSearchParams): Promise<SearchResponse | unknown> => {
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
   */
  searchForFacetValues = restartableTask(
    async (
      indexName: string,
      facetName: string,
      query: string,
      params?: RequestOptions,
    ): Promise<SearchForFacetValuesResponse | undefined> => {
      try {
        let index = this.client.initIndex(indexName);
        const results = await index.searchForFacetValues(
          facetName,
          query,
          params,
        );

        if (facetName === FacetName.Owners) {
          await this.store.maybeFetchPeople.perform(
            results.facetHits.map((hit) => hit.value),
          );
        }

        return results;
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );
}
