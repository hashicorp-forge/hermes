import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { restartableTask, task } from "ember-concurrency";
import { next, schedule } from "@ember/runloop";
import htmlElement from "hermes/utils/html-element";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
  RelatedResourceSelector,
} from "hermes/components/related-resources";
import { assert } from "@ember/debug";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import { FLASH_MESSAGES_LONG_TIMEOUT } from "hermes/utils/ember-cli-flash/timeouts";
import updateRelatedResourcesSortOrder from "hermes/utils/update-related-resources-sort-order";
import highlightElement from "hermes/utils/ember-animated/highlight-element";
import scrollIntoViewIfNeeded from "hermes/utils/scroll-into-view-if-needed";

export interface DocumentSidebarRelatedResourcesComponentArgs {
  productArea?: string;
  objectID?: string;
  headerTitle: string;
  modalHeaderTitle: string;
  searchFilters?: string;
  optionalSearchFilters?: string;
  itemLimit?: number;
  modalInputPlaceholder: string;
  documentIsDraft?: boolean;
  docWasCreatedOffApp?: boolean;
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
  @service declare flashMessages: HermesFlashMessagesService;

  @tracked relatedLinks: RelatedExternalLink[] = [];
  @tracked relatedDocuments: RelatedHermesDocument[] = [];
  @tracked loadingHasFailed = false;

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
   * The text passed to the TooltipIcon beside the title.
   */
  protected get titleTooltipText(): string {
    return `Documents and links that are relevant to this work.`;
  }

  /**
   * The action to update the `sortOrder` attribute of
   * the resources, based on their position in the array.
   * Called when the resource list is saved.
   */
  @action private updateSortOrder() {
    updateRelatedResourcesSortOrder(this.relatedDocuments, this.relatedLinks);
  }

  /**
   * The action run when the user saves changes on a
   * RelatedExternalLink. Confirms that the resource exists,
   * updates it locally, then saves it to the DB.
   */
  @action protected editResource(resource: RelatedExternalLink) {
    const cachedLinks = this.relatedLinks.slice();

    let resourceIndex = this.relatedLinks.findIndex(
      (link) => link.sortOrder === resource.sortOrder,
    );

    if (resourceIndex !== -1) {
      const linkBeingEdited = this.relatedLinks[resourceIndex];
      assert("linkBeingEdited must exist", linkBeingEdited);

      // We replace the values rather than the object itself.
      // This helps Ember Animated recognize the edited sprite as `kept`.
      linkBeingEdited.url = resource.url;
      linkBeingEdited.name = resource.name;

      // The getter doesn't update when a new resource is added, so we manually save it.
      // TODO: Improve this
      this.relatedLinks = this.relatedLinks;

      void this.saveRelatedResources.perform(
        this.relatedDocuments,
        cachedLinks,
        resource.sortOrder,
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
      resourceSelector,
    );
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
    if (this.args.docWasCreatedOffApp) return;

    try {
      const resources = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/${
            this.args.documentIsDraft ? "drafts" : "documents"
          }/${this.args.objectID}/related-resources`,
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
          scrollIntoViewIfNeeded(target as HTMLElement, {
            block: "nearest",
            behavior: "smooth",
          });
        });

        highlightElement(target);
      });
    },
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
      elementSelectorToHighlight?: string | number,
    ) => {
      if (elementSelectorToHighlight) {
        void this.animateHighlight.perform(elementSelectorToHighlight);
      }

      try {
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/${
            this.args.documentIsDraft ? "drafts" : "documents"
          }/${this.args.objectID}/related-resources`,
          {
            method: "PUT",
            body: JSON.stringify(this.formattedRelatedResources),
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      } catch (e) {
        this.relatedLinks = cachedLinks;
        this.relatedDocuments = cachedDocuments;

        this.flashMessages.critical((e as any).message, {
          title: "Unable to save resource",
          timeout: FLASH_MESSAGES_LONG_TIMEOUT,
        });
      }
    },
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources": typeof DocumentSidebarRelatedResourcesComponent;
  }
}
