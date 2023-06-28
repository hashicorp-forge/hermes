import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import NativeArray from "@ember/array/-private/native-array";
import ConfigService from "hermes/services/config";
import { fadeIn } from "ember-animated/motions/opacity";
import { TransitionContext } from "ember-animated/.";
import AlgoliaService from "hermes/services/algolia";
import { restartableTask } from "ember-concurrency";
import { next } from "@ember/runloop";

export interface RelatedExternalLink {
  url: string;
  title: string;
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
    // this is probably wrong, confirm
    onChange: () => void;
  };
}

export default class DocumentSidebarRelatedResourcesComponent extends Component<DocumentSidebarRelatedResourcesComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;

  @tracked relatedLinks: NativeArray<RelatedExternalLink> = A();
  @tracked relatedDocuments: NativeArray<HermesDocument> = A();
  @tracked _shownDocuments: HermesDocument[] | null = null;

  @tracked addResourceModalIsShown = false;

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
      let relatedDocIDs = this.relatedDocuments.map((doc) => doc.objectID);

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

  get relatedResources(): {
    [key: string]: RelatedExternalLink | HermesDocument;
  } {
    let resourcesArray: NativeArray<RelatedExternalLink | HermesDocument> = A();
    resourcesArray.pushObjects(this.relatedDocuments);
    resourcesArray.pushObjects(this.relatedLinks);

    let resourcesObject: {
      [key: string]: RelatedExternalLink | HermesDocument;
    } = {};

    resourcesArray.forEach((resource: RelatedExternalLink | HermesDocument) => {
      let key = "";

      if ("url" in resource) {
        key = resource.url;
      } else if ("objectID" in resource) {
        key = resource.objectID;
      }
      resourcesObject[key] = resource;
    });

    return resourcesObject;
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
    // TODO: call `onChange` here
    alert("TODO");
  }

  @action addRelatedExternalLink(link: RelatedExternalLink) {
    // TODO: call `onChange` here
    this.relatedLinks.unshiftObject(link);
  }

  @action addRelatedDocument(documentObjectID: string) {
    // TODO: call `onChange` here
    let document = this.shownDocuments[documentObjectID];
    if (document) {
      this.relatedDocuments.unshiftObject(document);
    }
    this.hideAddResourceModal();
  }

  @action removeResource(resource: RelatedExternalLink | HermesDocument) {
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
