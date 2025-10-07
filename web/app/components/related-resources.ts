import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { restartableTask, timeout } from "ember-concurrency";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { XDropdownListAnchorAPI } from "./x/dropdown-list";
import { SearchOptions } from "instantsearch.js";
import { next } from "@ember/runloop";
import { isTesting } from "@embroider/macros";
import StoreService from "hermes/services/store";

export type RelatedResource = RelatedExternalLink | RelatedHermesDocument;

export enum RelatedResourceSelector {
  ExternalLink = ".external-resource",
  HermesDocument = ".hermes-document",
}

export interface RelatedExternalLink {
  name: string;
  url: string;
  sortOrder: number;
}

export interface RelatedHermesDocument {
  googleFileID: string;
  title: string;
  documentType: string;
  documentNumber: string;
  createdTime?: number;
  modifiedTime: number;
  sortOrder: number;
  product: string;
  status: string;
  owners: string[];
  summary?: string;
}

export enum RelatedResourcesScope {
  ExternalLinks = "external-links",
  Documents = "documents",
}

interface RelatedResourcesComponentSignature {
  Element: null;
  Args: {
    items?: RelatedResource[];
    isLoading?: boolean;
    loadingHasFailed?: boolean;
    modalHeaderTitle: string; // TODO: make optional
    modalInputPlaceholder: string; // TODO: make optional
    documentObjectID?: string;
    optionalSearchFilters?: string;
    searchFilters?: string;
    addResource: (resource: RelatedResource) => void;
    scope?: `${RelatedResourcesScope}`;
  };
  Blocks: {
    header: [
      rr: {
        showModal: () => void;
      },
    ];
    list: [
      rr: {
        items: RelatedResource[];
        showModal: () => void;
      },
    ];
    "list-error": [];
    "list-loading": [];
  };
}

export default class RelatedResourcesComponent extends Component<RelatedResourcesComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare store: StoreService;

  @tracked private _algoliaResults: HermesDocument[] | null = null;

  @tracked protected modalIsShown = false;

  /**
   * Whether to show an error message in the search modal.
   * Set true when an Algolia search fails.
   */
  @tracked searchErrorIsShown = false;

  get items() {
    return this.args.items ?? [];
  }

  /**
   * The Algolia results for a query. Updated by the `search` task
   * and displayed in the "add resources" modal.
   */
  protected get algoliaResults(): { [key: string]: HermesDocument } {
    /**
     * The array initially looks like this:
     * [{title: "foo", objectID: "bar"...}, ...]
     *
     * We transform it to look like:
     * { "bar": {title: "foo", objectID: "bar"...}, ...}
     */
    let documents: any = {};

    if (this._algoliaResults) {
      this._algoliaResults.forEach((doc) => {
        documents[doc.objectID] = doc;
      });
    }
    return documents;
  }

  /**
   * The action to set the locally tracked Algolia results to null.
   * Used in template computations when a search fails, or when a link is
   * recognized as an external resource by a child component.
   */
  @action protected resetAlgoliaResults() {
    this._algoliaResults = null;
  }

  @action protected showModal() {
    this.modalIsShown = true;
  }

  @action protected hideModal() {
    this.modalIsShown = false;
  }

  @action protected addResource(resource: RelatedResource) {
    this.args.addResource(resource);
    this.hideModal();
  }

  /**
   * The action run when a search errors. Resets the Algolia results
   * and causes a search error to appear.
   */
  @action private handleSearchError(e: unknown) {
    // This triggers the "no matches" block,
    // which is where we're displaying the error.
    this.resetAlgoliaResults();
    this.searchErrorIsShown = true;
    console.error("Algolia search failed", e);
  }

  protected get relatedDocuments() {
    return (
      (this.args.items?.filter((resource) => {
        return "googleFileID" in resource;
      }) as RelatedHermesDocument[]) ?? []
    );
  }

  protected get relatedLinks() {
    return (
      (this.args.items?.filter((resource) => {
        return "url" in resource;
      }) as RelatedExternalLink[]) ?? []
    );
  }

  /**
   * The search task passed to the "Add..." modal.
   * Returns Algolia document matches for a query and updates
   * the dropdown with the correct menu item IDs.
   * Runs whenever the input value changes.
   */
  protected search = restartableTask(
    async (
      dd: XDropdownListAnchorAPI | null,
      query: string,
      shouldIgnoreDelay?: boolean,
      options?: SearchOptions,
    ) => {
      let index = this.configSvc.config.algolia_docs_index_name;

      // Empty queries target the modifiedTime-sorted replica index
      // to return a list of recently updated documents.
      if (query === "") {
        index += "_modifiedTime_desc";
      }

      let filterString = "";

      // Make sure the current document is omitted from the results
      if (this.args.documentObjectID) {
        filterString = `(NOT objectID:"${this.args.documentObjectID}")`;
      }

      // And if there are any related documents, omit those too
      if (this.relatedDocuments.length) {
        let relatedDocIDs = this.relatedDocuments.map(
          (doc) => doc.googleFileID,
        );

        filterString = filterString.slice(0, -1) + " ";

        const maybeAnd = this.args.documentObjectID ? "AND " : "(";

        filterString += `${maybeAnd}NOT objectID:"${relatedDocIDs.join(
          '" AND NOT objectID:"',
        )}")`;
      }

      // If there are search filters, e.g., "doctype:RFC" add them to the query
      if (this.args.searchFilters) {
        filterString += ` AND (${this.args.searchFilters})`;
      }

      let maybeOptionalFilters = "";

      if (this.args.optionalSearchFilters) {
        maybeOptionalFilters = this.args.optionalSearchFilters;
      }

      if (options?.optionalFilters) {
        maybeOptionalFilters += ` ${options.optionalFilters}`;
      }

      try {
        let algoliaResponse = await this.algolia.searchIndex
          .perform(index, query, {
            hitsPerPage: options?.hitsPerPage || 12,
            filters: filterString,
            attributesToRetrieve: [
              "title",
              "product",
              "docNumber",
              "docType",
              "status",
              "owners",
              "summary",
              "createdTime",
              "modifiedTime",
            ],

            // https://www.algolia.com/doc/guides/managing-results/rules/merchandising-and-promoting/in-depth/optional-filters/
            // Include any optional search filters, e.g., "product:Terraform"
            // to give a higher ranking to results that match the filter.
            optionalFilters: maybeOptionalFilters,
          })
          .then((response) => response);
        if (algoliaResponse) {
          this._algoliaResults = algoliaResponse.hits as HermesDocument[];

          // Load the owner information
          await this.store.maybeFetchPeople.perform(this._algoliaResults);
          if (dd) {
            dd.resetFocusedItemIndex();
          }
        }
        if (dd) {
          next(() => {
            dd.scheduleAssignMenuItemIDs();
          });
        }
        this.searchErrorIsShown = false;

        if (!shouldIgnoreDelay) {
          // This will show the "loading" spinner for some additional time
          // unless the task is restarted. This is to prevent the spinner
          // from flashing when the user types and results return quickly.
          await timeout(isTesting() ? 0 : 200);
        }
      } catch (e: unknown) {
        this.handleSearchError(e);
      }
    },
  );

  /**
   * Requests an Algolia document by ID.
   * If found, sets the local Algolia results to an array
   * with that document. If not, throws a 404 to the child component.
   */
  protected getObject = restartableTask(
    async (dd: XDropdownListAnchorAPI | null, objectID: string) => {
      try {
        let algoliaResponse = await this.algolia.getObject.perform(objectID);
        if (algoliaResponse) {
          this._algoliaResults = [
            algoliaResponse,
          ] as unknown as HermesDocument[];
          if (dd) {
            dd.resetFocusedItemIndex();
          }
          if (dd) {
            next(() => {
              dd.scheduleAssignMenuItemIDs();
            });
          }
        }
      } catch (e: unknown) {
        const typedError = e as { status?: number };
        if (typedError.status === 404) {
          // This means the document wasn't found.
          // Let the child component handle the error.
          throw e;
        } else {
          this.handleSearchError(e);
        }
      }
    },
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RelatedResources: typeof RelatedResourcesComponent;
  }
}
