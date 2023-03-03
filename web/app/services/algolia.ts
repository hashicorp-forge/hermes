import Service from "@ember/service";
import algoliaSearch, { SearchClient, SearchIndex } from "algoliasearch";
import { SearchForFacetValuesResponse } from "@algolia/client-search";
import config from "hermes/config/environment";
import { inject as service } from "@ember/service";
import { restartableTask, task } from "ember-concurrency";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { RequestOptions } from "@algolia/transporter";
import {
  SearchOptions,
  SearchResponse,
  ObjectWithObjectID,
} from "@algolia/client-search";
import { assert } from "@ember/debug";
import ConfigService from "./config";
import {
  FacetDropdownObjectDetails,
  FacetRecord,
  FacetRecords,
} from "hermes/types/facets";
import FetchService from "./fetch";
import SessionService from "./session";

export const HITS_PER_PAGE = 12;
export const MAX_VALUES_PER_FACET = 100;
export const FACET_NAMES = ["docType", "owners", "product", "status"];

export type AlgoliaSearchParams = RequestOptions & SearchOptions;
export type AlgoliaFacetsObject = NonNullable<SearchResponse["facets"]>;

export default class AlgoliaService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  /**
   * A shorthand getter for the authenticatedUser's email.
   */
  private get userEmail(): string {
    return this.authenticatedUser.info.email;
  }

  /**
   * Returns an Algolia SearchClient based on the environment.
   */
  private createClient(): SearchClient {
    /**
     * If not running as production, use environment variables and directly
     * interact with Algolia's API.
     */
    if (config.environment != "production") {
      console.log(
        "Running as non-production environment: Algolia client configured to directly interact with Algolia's API."
      );
      return algoliaSearch(config.algolia.appID, config.algolia.apiKey);
    }
    /**
     * If running as production, use environment variables and route Algolia
     * requests through the Hermes API.
     */
    if (
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost"
    ) {
      console.log(
        "Running locally as production environment: Algolia client configured to proxy requests through the Hermes API."
      );
      return algoliaSearch("", "", {
        headers: {
          "Hermes-Google-Access-Token":
            this.session.data.authenticated.access_token,
        },
        hosts: [
          {
            protocol: "http",
            url: window.location.hostname + ":" + window.location.port,
          },
        ],
      });
    }
    /**
     * If running remotely as production, use HTTPS and route Algolia requests
     * through the Hermes API.
     */
    return algoliaSearch("", "", {
      headers: {
        "Hermes-Google-Access-Token":
          this.session.data.authenticated.access_token,
      },
      hosts: [
        {
          protocol: "https",
          url: window.location.hostname + ":" + window.location.port,
        },
      ],
    });
  }

  /**
   * An Algolia SearchClient.
   * Used to initialize an environment-scoped SearchIndex.
   */
  private client: SearchClient = this.createClient();

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
  mapStatefulFacetKeys = (facetObject: AlgoliaFacetsObject): FacetRecords => {
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
          selected: false,
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
             * { "meg@hashicorp.com": { count: 10, selected: false }}
             */
            newVal[prop] = mapper(valProp);
          }
        }
        newObj[key] = newVal;
        return newObj;
      },
      {}
    );
    /**
     * e.g., entries === {
     *  owners: {
     *   "meg@hashicorp.com": { count: 10, selected: false },
     *  },
     *  status: {
     *    Obsolete: { count: 4, selected: false },
     *    Approved: { count: 6, selected: false },
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
     *  Obsolete: { count: 4, selected: false },
     *  Approved: { count: 6, selected: false },
     * }
     */
    if (selection) {
      /**
       * e.g., selection === ["Approved"]
       */
      for (let param of selection) {
        (facet[param] as FacetDropdownObjectDetails).selected = true;
      }
      /**
       * e.g., facet["Approved"] === { count: 6, selected: true }
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
      params: AlgoliaSearchParams
    ): Promise<SearchResponse<unknown>> => {
      let index: SearchIndex = this.client.initIndex(indexName);
      return await index.search(query, params);
    }
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
    let facets = FACET_NAMES;
    let facetFilters = [];

    for (let facet of facets) {
      let facetValues = [];

      for (let val of params[facet]) {
        facetValues.push(`${facet}:${val}`);
      }

      if (facetValues.length > 0) {
        facetFilters.push(facetValues);
      }
    }

    if (userIsOwner) {
      facetFilters.push(`owners:${this.userEmail}`);
    }
    return facetFilters;
  }

  /**
   * Returns a search response for a given query and params.
   * Restarts with every search input keystroke.
   */
  search = restartableTask(
    async (
      query: string,
      params
    ): Promise<SearchResponse<unknown> | undefined> => {
      try {
        return await this.index
          .search(query, params)
          .then((response) => response);
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

  /**
   * Returns FacetRecords for a given index and params.
   * If the user is the owner, the facets will be filtered by the owner's email.
   */
  getFacets = task(
    async (
      searchIndex: string,
      params: AlgoliaSearchParams,
      userIsOwner = false
    ): Promise<FacetRecords | undefined> => {
      let query = params["q"] || "";
      try {
        let facetFilters = userIsOwner ? [`owners:${this.userEmail}`] : [];
        let algoliaFacets = await this.searchIndex.perform(searchIndex, query, {
          facetFilters: facetFilters,
          facets: FACET_NAMES,
          hitsPerPage: HITS_PER_PAGE,
          maxValuesPerFacet: MAX_VALUES_PER_FACET,
          page: params.page ? params.page - 1 : 0,
        });

        assert("getFacets expects facets to exist", algoliaFacets.facets);

        /**
         * Map the facets to a new object with additional nested properties
         */
        let facets: FacetRecords = this.mapStatefulFacetKeys(
          algoliaFacets.facets
        );

        // Mark facets as selected based on query parameters
        Object.entries(facets).forEach(([name, facet]) => {
          /**
           * e.g., name === "owner"
           * e.g., facet === { "meg@hashicorp.com": { count: 1, selected: false }}
           */
          this.markSelected(facet, params[name]);
        });

        return facets;
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

  /**
   * Returns a SearchResponse for a given index and params.
   * If the user is the owner, i.e., when on the `/my` route,
   * facets will be scoped to the owner's email.
   */
  getDocResults = task(
    async (
      searchIndex: string,
      params: AlgoliaSearchParams,
      userIsOwner = false
    ): Promise<SearchResponse | unknown> => {
      let query = params["q"] || "";

      try {
        return await this.searchIndex.perform(searchIndex, query, {
          facetFilters: this.buildFacetFilters(params, userIsOwner),
          facets: FACET_NAMES,
          hitsPerPage: HITS_PER_PAGE,
          maxValuesPerFacet: MAX_VALUES_PER_FACET,
          page: params.page ? params.page - 1 : 0,
        });
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

  /**
   * CURRENTLY UNUSED
   * Mocked for use in `TagSelect` component
   */
  searchForFacetValues = restartableTask(
    async (
      indexName: string,
      facetName: string,
      query: string,
      params: RequestOptions
    ): Promise<SearchForFacetValuesResponse | undefined> => {
      try {
        let index = this.client.initIndex(indexName);
        return await index.searchForFacetValues(facetName, query, params);
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );
}
