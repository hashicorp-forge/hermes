import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { HermesDocument } from "hermes/types/document";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { restartableTask, task, timeout } from "ember-concurrency";
import { next, schedule } from "@ember/runloop";
import htmlElement from "hermes/utils/html-element";
import Ember from "ember";
import FlashMessageService from "ember-cli-flash/services/flash-messages";

export type RelatedResource = RelatedExternalLink | RelatedHermesDocument;

enum RelatedResourceSelector {
  ExternalLink = ".external-resource",
  HermesDocument = ".hermes-document",
}

export interface RelatedExternalLink {
  name: string;
  url: string;
  sortOrder: number;
}

export interface RelatedHermesDocument {
  id: number;
  googleFileID: string;
  title: string;
  type: string;
  documentNumber: string;
  sortOrder: number;
}

export interface DocumentSidebarRelatedResourcesComponentArgs {
  productArea?: string;
  objectID?: string;
  allowAddingExternalLinks?: boolean;
  headerTitle: string;
  modalHeaderTitle: string;
  searchFilters?: string;
  optionalSearchFilters?: string[];
  itemLimit?: number;
  modalInputPlaceholder: string;
  documentIsDraft?: boolean;
  editingIsDisabled?: boolean;
}

interface DocumentSidebarRelatedResourcesComponentSignature {
  Args: DocumentSidebarRelatedResourcesComponentArgs;
}

export default class DocumentSidebarRelatedResourcesComponent extends Component<DocumentSidebarRelatedResourcesComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare flashMessages: FlashMessageService;

  @tracked relatedLinks: RelatedExternalLink[] = [];
  @tracked relatedDocuments: RelatedHermesDocument[] = [];

  @tracked _algoliaResults: HermesDocument[] | null = null;

  @tracked addResourceModalIsShown = false;
  @tracked loadingHasFailed = false;

  /**
   * Whether to show an error message in the search modal.
   * Set true when an Algolia search fails.
   */
  @tracked searchErrorIsShown = false;

  /**
   * The related resources object, formatted for a PUT request to the API.
   */
  private get formattedRelatedResources(): {
    hermesDocuments: Partial<RelatedHermesDocument>[];
    externalLinks: Partial<RelatedExternalLink>[];
  } {
    const externalLinks = this.relatedLinks.map((link) => {
      return {
        name: link.name || link.url,
        url: link.url,
        sortOrder: this.relatedLinks.indexOf(link) + 1,
      };
    });

    const hermesDocuments = this.relatedDocuments.map((doc) => {
      return {
        googleFileID: doc.googleFileID,
        sortOrder:
          this.relatedDocuments.indexOf(doc) + 1 + externalLinks.length,
      };
    });

    return {
      externalLinks,
      hermesDocuments,
    };
  }

  /**
   * The related resources object, formatted for the RelatedResourcesList.
   */
  protected get relatedResources(): {
    [key: string]: RelatedResource;
  } {
    let resourcesArray: RelatedResource[] = [];

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
        (resourcesObject[key] as RelatedResource).sortOrder =
          resourcesArray.indexOf(resource) + 1;
      }
    );

    return resourcesObject;
  }

  /**
   * Whether the "Add Resource" button should be hidden.
   * True when editing is explicitly disabled (e.g., when the viewer doesn't have edit
   * permissions), and when the item limit is reached (to be used for single-doc
   * attributes like "RFC" or "PRD")
   */
  protected get sectionHeaderButtonIsHidden(): boolean {
    if (this.args.editingIsDisabled) {
      return true;
    }

    if (this.args.itemLimit) {
      return Object.keys(this.relatedResources).length >= this.args.itemLimit;
    } else {
      return false;
    }
  }

  /**
   * The search task passed to the "Add..." modal.
   * Returns Algolia document matches for a query and updates
   * the dropdown with the correct menu item IDs.
   * Runs whenever the input value changes.
   */
  protected search = restartableTask(async (dd: any, query: string) => {
    let index =
      this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

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
          // TODO: Confirm this with a fresh index
          optionalFilters: this.args.optionalSearchFilters,
        })
        .then((response) => response);
      if (algoliaResponse) {
        this._algoliaResults = algoliaResponse.hits as HermesDocument[];
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
    } catch (e: unknown) {
      // This will trigger the "no matches" block,
      // which is where we're displaying the error.
      this._algoliaResults = null;
      this.searchErrorIsShown = true;
      console.error(e);
    }
  });

  /**
   * TODO: Investigate if this can be combined with relatedResources/formattedResources
   */
  protected get relatedResourcesObjectEntries(): RelatedResource[] {
    const objectEntries = Object.entries(this.relatedResources);
    return objectEntries.map((entry) => {
      return entry[1];
    });
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
   * The action run when the "add resource" plus button is clicked.
   * Shows the modal.
   */
  @action protected showAddResourceModal() {
    this.addResourceModalIsShown = true;
  }

  /**
   * The action run to close the "add resources" modal.
   * Called on `esc` and by clicking the X button.
   */
  @action protected hideAddResourceModal() {
    this.addResourceModalIsShown = false;
  }

  /**
   * The action run when the user saves changes on a
   * RelatedExternalLink. Confirms that the resource exists,
   * updates it locally, then saves it to the DB.
   */
  @action protected editResource(resource: RelatedExternalLink) {
    let resourceIndex = this.relatedLinks.findIndex(
      (link) => link.sortOrder === resource.sortOrder
    );

    if (resourceIndex !== -1) {
      this.relatedLinks[resourceIndex] = resource;

      // PROBLEM: the getter isn't updating with the new resource
      this.relatedLinks = this.relatedLinks;

      void this.saveRelatedResources.perform(
        `#related-resource-${resource.sortOrder}`
      );
    }
  }

  /**
   *
   *
   *
   *
   * TODO:
   * Combine these "add" functions into a single method?
   *
   *
   *
   *
   *
   */

  /**
   * The action to add an external link to a document.
   * Adds the link into the local array, then saves to the DB.
   */
  @action protected addRelatedExternalLink(link: RelatedExternalLink) {
    this.relatedLinks.unshiftObject(link);
    void this.saveRelatedResources.perform(
      RelatedResourceSelector.ExternalLink
    );
  }

  /**
   * The action to add a Hermes document as a related resource.
   * Adds the link to the local array, then saves it to the DB.
   */
  @action protected addRelatedDocument(documentObjectID: string) {
    let document = this.algoliaResults[documentObjectID];
    if (document) {
      const relatedHermesDocument = {
        googleFileID: document.objectID,
        title: document.title,
        type: document.docType,
        documentNumber: document.docNumber,
        sortOrder: 1,
      } as RelatedHermesDocument;

      this.relatedDocuments.unshiftObject(relatedHermesDocument);
    }

    void this.saveRelatedResources.perform(
      RelatedResourceSelector.HermesDocument
    );

    this.hideAddResourceModal();
  }

  /**
   * The task called to remove a resource from a document.
   * Triggered via the overflow menu or the "Edit resource" modal.
   */
  @action protected removeResource(resource: RelatedResource) {
    if ("url" in resource) {
      this.relatedLinks.removeObject(resource);
    } else {
      this.relatedDocuments.removeObject(resource);
    }
    void this.saveRelatedResources.perform();
  }

  /**
   * The action run when the component is rendered.
   * Loads the document's related resources, if they exist.
   * On error, triggers the "retry" design.
   */
  protected loadRelatedResources = task(async () => {
    try {
      const resources = await this.fetchSvc
        .fetch(
          `/api/v1/${this.args.documentIsDraft ? "drafts" : "documents"}/${
            this.args.objectID
          }/related-resources`
        )
        .then((response) => response?.json());

      if (resources.hermesDocuments) {
        this.relatedDocuments = resources.hermesDocuments;
      }

      if (resources.externalLinks) {
        this.relatedLinks = resources.externalLinks;
      }

      this.loadingHasFailed = false;
    } catch (e: unknown) {
      this.loadingHasFailed = true;
    }
  });

  /**
   * The task to animate a resource with a highlight.
   * Called when a resource is added or edited.
   * Temporarily adds a visual indicator of the changed element.
   */
  protected animateHighlight = restartableTask(async (selector: string) => {
    schedule("afterRender", async () => {
      // New resources will always be the first element
      const newResourceLink = htmlElement(
        `.related-resource${selector} .related-resource-link`
      );

      const highlight = document.createElement("div");
      highlight.classList.add("highlight-affordance");
      newResourceLink.insertBefore(highlight, newResourceLink.firstChild);

      const fadeInAnimation = highlight.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 50 }
      );

      await timeout(Ember.testing ? 0 : 2000);

      const fadeOutAnimation = highlight.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 400 }
      );

      try {
        await fadeInAnimation.finished;
        await fadeOutAnimation.finished;
      } finally {
        fadeInAnimation.cancel();
        fadeOutAnimation.cancel();
        highlight.remove();
      }
    });
  });

  /**
   * The task to save the document's related resources.
   * Creates a PUT request to the DB and conditionally triggers
   * the resource-highlight animation.
   */
  protected saveRelatedResources = task(async (selector?: string) => {
    if (selector) {
      void this.animateHighlight.perform(selector);
    }

    try {
      await this.fetchSvc.fetch(
        `/api/v1/${this.args.documentIsDraft ? "drafts" : "documents"}/${
          this.args.objectID
        }/related-resources`,
        {
          method: "PUT",
          body: JSON.stringify(this.formattedRelatedResources),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      throw new Error("should show error");
    } catch (e: unknown) {
      console.log("should show error");
      this.flashMessages.add({
        title: "Save error",
        message: (e as any).message,
        type: "critical",
        sticky: true,
        extendedTimeout: 1000,
      });
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources": typeof DocumentSidebarRelatedResourcesComponent;
  }
}
