import Component from "@glimmer/component";
import { A } from "@ember/array";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import NativeArray from "@ember/array/-private/native-array";
import ConfigService from "hermes/services/config";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import move from "ember-animated/motions/move";
import { TransitionContext, wait } from "ember-animated/.";
import animateScale from "hermes/utils/ember-animated/animate-scale";
import { easeOutQuad } from "hermes/utils/ember-animated/easings";
import AlgoliaService from "hermes/services/algolia";
import { restartableTask } from "ember-concurrency";
import { next } from "@ember/runloop";

interface InputsDocumentSelectComponentSignature {
  Args: {
    productArea?: string;
    objectID?: string;
  };
}

export interface RelatedExternalLink {
  url: string;
  title: string;
}

// const GOOGLE_FAVICON_URL_PREFIX =
//   "https://s2.googleusercontent.com/s2/favicons";

export default class InputsDocumentSelectComponent extends Component<InputsDocumentSelectComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;

  @tracked relatedLinks: NativeArray<RelatedExternalLink> = A();
  @tracked relatedDocuments: NativeArray<HermesDocument> = A();
  @tracked _shownDocuments: HermesDocument[] | null = null;

  @tracked modalIsShown = false;

  // @tracked dd: any = null;

  get relatedResourcesAreShown(): boolean {
    return Object.keys(this.relatedResources).length > 0;
  }

  *linkCardTransition({ insertedSprites, removedSprites }: TransitionContext) {
    for (let sprite of insertedSprites) {
      void fadeIn(sprite, { duration: 100 });
    }
  }

  *transition({
    insertedSprites,
    keptSprites,
    removedSprites,
  }: TransitionContext) {
    for (let sprite of keptSprites) {
      void move(sprite, { duration: 250, easing: easeOutQuad });
    }

    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: 0 });
    }

    for (let sprite of insertedSprites) {
      // sprite.startTranslatedBy(0, -4);
      sprite.applyStyles({
        opacity: "0",
      });
      yield wait(100);
      void animateScale(sprite, {
        from: 0.95,
        to: 1,
        duration: 200,
        easing: easeOutQuad,
      });
      void fadeIn(sprite, { duration: 50 });
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

  @action showModal() {
    this.modalIsShown = true;
  }

  @action hideModal() {
    this.modalIsShown = false;

    // This updates the suggestions for the next time the modal is opened
    // void this.search.perform(null, "");
  }

  @action addRelatedExternalLink(link: RelatedExternalLink) {
    this.relatedLinks.unshiftObject(link);
  }

  @action addRelatedDocument(documentObjectID: string) {
    let document = this.shownDocuments[documentObjectID];
    if (document) {
      this.relatedDocuments.unshiftObject(document);
    }
    this.hideModal();
  }

  @action editExternalLink(resource: RelatedExternalLink) {
    // TODO: show an edit modal

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
    "Inputs::DocumentSelect": typeof InputsDocumentSelectComponent;
  }
}
