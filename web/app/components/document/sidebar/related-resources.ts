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
import maybeScrollIntoView from "hermes/utils/maybe-scroll-into-view";
import { XDropdownListAnchorAPI } from "hermes/components/x/dropdown-list";

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
  scrollContainer: HTMLElement;
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
   * The related resources object, minimally formatted for a PUT request to the API.
   */
  private get formattedRelatedResources(): {
    hermesDocuments: Partial<RelatedHermesDocument>[];
    externalLinks: Partial<RelatedExternalLink>[];
  } {
    this.updateSortOrder();

    const hermesDocuments = this.relatedDocuments.map((doc) => {
      return {
        googleFileID: doc.googleFileID,
        sortOrder: doc.sortOrder,
      };
    });

    const externalLinks = this.relatedLinks.map((link) => {
      return {
        name: link.name,
        url: link.url,
        sortOrder: link.sortOrder,
      };
    });

    return {
      externalLinks,
      hermesDocuments,
    };
  }

  /**
   * The combined resources array, formatted for the RelatedResourcesList.
   */
  protected get relatedResources(): RelatedResource[] {
    let resourcesArray: RelatedResource[] = [];

    this.updateSortOrder();

    resourcesArray.pushObjects(this.relatedDocuments);
    resourcesArray.pushObjects(this.relatedLinks);

    return resourcesArray;
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
      return this.relatedResources.length >= this.args.itemLimit;
    } else {
      return false;
    }
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
   * The action to update the `sortOrder` attribute of
   * the resources, based on their position in the array.
   * Called when the resource list is saved.
   */
  @action private updateSortOrder() {
    this.relatedDocuments.forEach((doc, index) => {
      doc.sortOrder = index + 1;
    });

    this.relatedLinks.forEach((link, index) => {
      link.sortOrder = index + 1 + this.relatedDocuments.length;
    });
  }

  protected findObject = restartableTask(
    async (dd: XDropdownListAnchorAPI | null, objectID: string) => {
      let index = this.configSvc.config.algolia_docs_index_name;

      console.log("yuh");
      console.log(objectID);

      try {
        let algoliaResponse = await this.algolia.findObject.perform(
          index,
          objectID
        );
        if (algoliaResponse) {
          console.log(algoliaResponse);

          this._algoliaResults = [
            algoliaResponse,
          ] as unknown as HermesDocument[];
          if (dd) {
            dd.resetFocusedItemIndex();
          }
        }
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

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
      shouldIgnoreDelay?: boolean
    ) => {
      let index = this.configSvc.config.algolia_docs_index_name;

      // Make sure the current document is omitted from the results
      let filterString = `(NOT objectID:"${this.args.objectID}")`;

      // And if there are any related documents, omit those too
      if (this.relatedDocuments.length) {
        let relatedDocIDs = this.relatedDocuments.map(
          (doc) => doc.googleFileID
        );

        filterString = filterString.slice(0, -1) + " ";

        filterString += `AND NOT objectID:"${relatedDocIDs.join(
          '" AND NOT objectID:"'
        )}")`;
      }

      // If there are search filters, e.g., "doctype:RFC" add them to the query
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

            // https://www.algolia.com/doc/guides/managing-results/rules/merchandising-and-promoting/in-depth/optional-filters/
            // Include any optional search filters, e.g., "product:Terraform"
            // to give a higher ranking to results that match the filter.
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

        if (!shouldIgnoreDelay) {
          // This will show the "loading" spinner for some additional time
          // unless the task is restarted. This is to prevent the spinner
          // from flashing when the user types and results return quickly.
          await timeout(Ember.testing ? 0 : 200);
        }
      } catch (e: unknown) {
        // This will trigger the "no matches" block,
        // which is where we're displaying the error.
        this._algoliaResults = null;
        this.searchErrorIsShown = true;
        console.error(e);
      }
    }
  );

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
    const cachedLinks = this.relatedLinks.slice();

    let resourceIndex = this.relatedLinks.findIndex(
      (link) => link.sortOrder === resource.sortOrder
    );

    if (resourceIndex !== -1) {
      this.relatedLinks[resourceIndex] = resource;

      // The getter doesn't update when a new resource is added, so we manually save it.
      // TODO: Improve this
      this.relatedLinks = this.relatedLinks;
      void this.saveRelatedResources.perform(
        this.relatedDocuments,
        cachedLinks,
        resource.sortOrder
      );
    }
  }

  /**
   * The action to add a resource to a document.
   * Adds a resource to the correct array, then saves it to the DB,
   * triggering a resource-highlight animation.
   */
  @action protected addResource(resource: RelatedResource) {
    let resourceSelector = RelatedResourceSelector.ExternalLink;

    let cachedLinks = this.relatedLinks.slice();
    let cachedDocuments = this.relatedDocuments.slice();

    if ("url" in resource) {
      this.relatedLinks.unshiftObject(resource);
    } else {
      resourceSelector = RelatedResourceSelector.HermesDocument;
      this.relatedDocuments.unshiftObject(resource);
    }

    void this.saveRelatedResources.perform(
      cachedDocuments,
      cachedLinks,
      resourceSelector
    );

    this.hideAddResourceModal();
  }

  /**
   * The task called to remove a resource from a document.
   * Triggered via the overflow menu or the "Edit resource" modal.
   */
  @action protected removeResource(resource: RelatedResource) {
    const cachedDocuments = this.relatedDocuments;
    const cachedLinks = this.relatedLinks;

    if ("url" in resource) {
      this.relatedLinks.removeObject(resource);
    } else {
      this.relatedDocuments.removeObject(resource);
    }

    void this.saveRelatedResources.perform(cachedDocuments, cachedLinks);
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
  protected animateHighlight = restartableTask(
    async (classNameOrID: string | number) => {
      schedule("afterRender", async () => {
        let target: HTMLElement | null = null;

        // When editing, we select by ID. Otherwise, we select by class.
        let targetSelector =
          typeof classNameOrID === "number"
            ? "#related-resource-"
            : ".related-resource";

        // Add the class or ID to the selector
        targetSelector += `${classNameOrID}`;

        // Specify the target's anchor element
        targetSelector += " .related-resource-link";

        target = htmlElement(targetSelector);

        next(() => {
          maybeScrollIntoView(
            target as HTMLElement,
            this.args.scrollContainer,
            "getBoundingClientRect",
            10
          );
        });

        const highlight = document.createElement("div");
        highlight.classList.add("highlight-affordance");
        target.insertBefore(highlight, target.firstChild);

        const fadeInAnimation = highlight.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 50 }
        );

        await timeout(Ember.testing ? 0 : 2000);

        const fadeOutAnimation = highlight.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: Ember.testing ? 50 : 400 }
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
    }
  );

  /**
   * The task to save the document's related resources.
   * Creates a PUT request to the DB and conditionally triggers
   * the resource-highlight animation.
   */
  protected saveRelatedResources = task(
    async (
      cachedDocuments,
      cachedLinks,
      elementSelectorToHighlight?: string | number
    ) => {
      if (elementSelectorToHighlight) {
        void this.animateHighlight.perform(elementSelectorToHighlight);
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
      } catch (e: unknown) {
        this.relatedLinks = cachedLinks;
        this.relatedDocuments = cachedDocuments;

        this.flashMessages.add({
          title: "Unable to save resource",
          message: (e as any).message,
          type: "critical",
          sticky: true,
          extendedTimeout: 1000,
        });
      }
    }
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources": typeof DocumentSidebarRelatedResourcesComponent;
  }
}
