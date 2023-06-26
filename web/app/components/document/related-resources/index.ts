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

interface DocumentRelatedResourcesComponentSignature {
  Args: {
    productArea?: string;
    objectID?: string;
  };
}

export interface RelatedExternalLink {
  url: string;
  title: string;
}

export default class DocumentRelatedResourcesComponent extends Component<DocumentRelatedResourcesComponentSignature> {
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

  *linkCardTransition({ insertedSprites }: TransitionContext) {
    for (let sprite of insertedSprites) {
      void fadeIn(sprite, { duration: 100 });
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
          // TODO: investigate why this doesn't work
          optionalFilters: ["product:" + this.args.productArea],
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

    // we only need the attributes, not the keys
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
     * We need it to look like:
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

    // This updates the suggestions for the next time the modal is opened
    // void this.search.perform(null, "");
  }

  @action editResource(resource: RelatedExternalLink) {
    alert("time to save the donuts");
  }

  @action addRelatedExternalLink(link: RelatedExternalLink) {
    this.relatedLinks.unshiftObject(link);
  }

  @action addRelatedDocument(documentObjectID: string) {
    let document = this.shownDocuments[documentObjectID];
    if (document) {
      this.relatedDocuments.unshiftObject(document);
    }
    this.hideAddResourceModal();
  }

  @action removeResource(resource: RelatedExternalLink | HermesDocument) {
    // if the resource is a RelatedExternalLink, remove it from the relatedLinks array
    // otherwise, remove it from the relatedDocuments array

    // TODO: make this more precise
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
    "Document::RelatedResources": typeof DocumentRelatedResourcesComponent;
  }
}
