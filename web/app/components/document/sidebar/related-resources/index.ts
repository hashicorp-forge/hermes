import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import NativeArray from "@ember/array/-private/native-array";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { restartableTask, task, timeout } from "ember-concurrency";
import { next } from "@ember/runloop";

export type RelatedResource = RelatedExternalLink | RelatedHermesDocument;

export interface RelatedExternalLink {
  id: string;
  title: string;
  url: string;
  order: number;
}

export interface RelatedHermesDocument {
  googleFileID: string;
  title: string;
  type: string;
  documentNumber: string;
  order: number;
}

interface DocumentSidebarRelatedResourcesComponentSignature {
  Args: {
    productArea?: string;
    objectID?: string;
    allowAddingExternalLinks?: boolean;
    headerTitle: string;
    modalHeaderTitle: string;
    searchFilters?: string;
    optionalSearchFilters?: string[];
    itemLimit?: number;
    modalInputPlaceholder: string;
    onChange: () => void;
  };
}

export default class DocumentSidebarRelatedResourcesComponent extends Component<DocumentSidebarRelatedResourcesComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;

  @tracked relatedLinks: RelatedExternalLink[] = [];
  @tracked relatedDocuments: RelatedHermesDocument[] = [];
  @tracked _shownDocuments: HermesDocument[] | null = null;

  @tracked addResourceModalIsShown = false;

  // @tracked relatedResources: RelatedResource | null = null;

  get relatedResources(): {
    [key: string]: RelatedExternalLink | RelatedHermesDocument;
  } {
    let resourcesArray: NativeArray<
      RelatedExternalLink | RelatedHermesDocument
    > = A();
    resourcesArray.pushObjects(this.relatedDocuments);
    resourcesArray.pushObjects(this.relatedLinks);

    let resourcesObject: {
      [key: string]: RelatedExternalLink | RelatedHermesDocument;
    } = {};

    resourcesArray.forEach(
      (resource: RelatedExternalLink | RelatedHermesDocument) => {
        let key = "";

        if ("url" in resource) {
          key = resource.url;
        } else if ("googleFileID" in resource) {
          key = resource.googleFileID;
        }
        resourcesObject[key] = resource;
      }
    );

    return resourcesObject;
  }

  get relatedResourcesAreShown(): boolean {
    return Object.keys(this.relatedResources).length > 0;
  }

  get sectionHeaderButtonIsHidden(): boolean {
    if (this.args.itemLimit) {
      return Object.keys(this.relatedResources).length >= this.args.itemLimit;
    } else {
      return false;
    }
  }

  protected search = restartableTask(async (dd: any, query: string) => {
    let index =
      this.configSvc.config.algolia_docs_index_name +
      "_createdTime_desc__productRanked";

    let filterString = `(NOT objectID:"${this.args.objectID}")`;

    if (this.relatedDocuments.length) {
      let relatedDocIDs = this.relatedDocuments.map((doc) => doc.googleFileID);

      filterString = filterString.slice(0, -1) + " ";

      filterString += `AND NOT objectID:"${relatedDocIDs.join(
        '" AND NOT objectID:"'
      )}")`;
    }

    if (this.args.searchFilters) {
      filterString += ` AND (${this.args.searchFilters})`;
    }

    try {
      let algoliaResponse = await this.algolia.searchIndex
        .perform(index, query, {
          hitsPerPage: 4,
          filters: filterString,
          attributesToRetrieve: [
            "title",
            "product",
            "docNumber",
            "docType",
            "status",
            "owners",
          ],
          optionalFilters: this.args.optionalSearchFilters,
        })
        .then((response) => response);
      if (algoliaResponse) {
        this._shownDocuments = algoliaResponse.hits as HermesDocument[];
        if (dd) {
          dd.resetFocusedItemIndex();
        }
      }
      if (dd) {
        next(() => {
          dd.scheduleAssignMenuItemIDs();
        });
      }
    } catch (e) {
      console.error(e);
    }
  });

  get relatedResourcesObjectEntries() {
    const objectEntries = Object.entries(this.relatedResources);
    return objectEntries.map((entry) => {
      return entry[1];
    });
  }

  get shownDocuments(): { [key: string]: HermesDocument } {
    /**
     * The array initially looks like this:
     * [{title: "foo", objectID: "bar"...}, ...]
     *
     * We transform it to look like:
     * { "bar": {title: "foo", objectID: "bar"...}, ...}
     */
    let documents: any = {};

    if (this._shownDocuments) {
      this._shownDocuments.forEach((doc) => {
        documents[doc.objectID] = doc;
      });
    }
    return documents;
  }

  @action showAddResourceModal() {
    this.addResourceModalIsShown = true;
  }

  @action hideAddResourceModal() {
    this.addResourceModalIsShown = false;
  }

  @action editResource(resource: RelatedExternalLink) {
    // need to find the resource by ID
    // then replace it in the array with the new resource

    let resourceIndex = this.relatedLinks.findIndex(
      (link) => link.id === resource.id
    );
  }

  protected loadRelatedResources = task(async () => {
    // make a fetch GET request to the back end
    try {
      // TODO: use when API is built
      // const resources = await this.fetchSvc
      //   .fetch(`/api/v1/documents/${this.args.objectID}/related-resources`)
      //   .then((response) => response?.json());

      const fakeResources: {
        hermesDocuments: RelatedHermesDocument[];
        externalLinks: RelatedExternalLink[];
      } = {
        hermesDocuments: [
          {
            googleFileID: "113_MX3wacdwXz2412EChoePvZ45CrjP5sL_nhN5cYNI",
            title: "Older Hermes Feature",
            type: "RFC",
            documentNumber: "HRM-005",
            order: 1,
          },
        ],
        externalLinks: [
          {
            title: "Figma resource",
            url: "https://www.testURL.com",
            order: 2,
          },
        ],
      };

      this.relatedDocuments = fakeResources.hermesDocuments;
      this.relatedLinks = fakeResources.externalLinks;
    } catch (e: unknown) {
      // do an inline error with ability to retry
    }
  });

  @action addRelatedExternalLink(link: RelatedExternalLink) {
    this.relatedLinks.unshiftObject(link);
    this.saveRelatedResources.perform();
  }

  @action addRelatedDocument(documentObjectID: string) {
    let document = this.shownDocuments[documentObjectID];
    if (document) {
      const relatedHermesDocument = {
        googleFileID: document.objectID,
        title: document.title,
        type: document.docType,
        documentNumber: document.docNumber,
        order: 1,
      } as RelatedHermesDocument;

      this.relatedDocuments.unshiftObject(relatedHermesDocument);
    }
    // TODO: maybe await?
    void this.saveRelatedResources.perform();
    this.hideAddResourceModal();
  }

  protected saveRelatedResources = task(async () => {
    // TODO: use when API is built
    // await this.fetchSvc.fetch(`/api/v1/documents/${this.args.objectID}/related-resources`, {
    //   method: "PUT",
    //   body: JSON.stringify(this.relatedDocuments),
    //   headers: {
    //     "Content-Type": "application/json"
    //   }
    // })
    await timeout(500);
  });

  @action removeResource(resource: RelatedResource) {
    // TODO: call `onChange` here
    if ("url" in resource) {
      this.relatedLinks.removeObject(resource);
      return;
    } else {
      this.relatedDocuments.removeObject(resource);
      return;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources": typeof DocumentSidebarRelatedResourcesComponent;
  }
}
