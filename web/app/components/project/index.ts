import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
} from "../related-resources";
import { RelatedResourceSelector } from "../document/sidebar/related-resources";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import { task } from "ember-concurrency";
import { HermesProject } from "hermes/types/project";
import { OverflowItem } from "../related-resources/overflow-menu";

interface ProjectIndexComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectIndexComponent extends Component<ProjectIndexComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked relatedDocuments = this.args.project.documents ?? [];
  @tracked relatedLinks: RelatedExternalLink[] =
    this.args.project.relatedLinks ?? [];

  @tracked modalIsShown = false;

  protected get overflowItemDeleteDoc(): OverflowItem {
    return {
      label: "Delete",
      icon: "trash",
      action: this.deleteDoc,
    };
  }

  protected get overflowItemDeleteLink(): OverflowItem {
    return {
      label: "Delete",
      icon: "trash",
      action: this.deleteRelatedLink,
    };
  }

  protected get overflowItemEdit(): OverflowItem {
    return {
      label: "Edit",
      icon: "pencil-tool",
      action: this.editResource,
    };
  }

  protected get overflowItemsForDocument(): Record<string, OverflowItem> {
    return {
      delete: this.overflowItemDeleteDoc,
    };
  }

  protected get overflowItemsForLink(): Record<string, OverflowItem> {
    return {
      edit: this.overflowItemEdit,
      delete: this.overflowItemDeleteLink,
    };
  }

  @action showModal() {
    this.modalIsShown = true;
  }

  @action hideModal() {
    this.modalIsShown = false;
  }

  @action protected addResource(resource: RelatedResource) {
    if ("googleFileID" in resource) {
      this.addDocument(resource as RelatedHermesDocument);
    } else {
      this.addLink(resource as RelatedExternalLink);
    }
  }

  @action protected saveProjectInfo() {
    return;
  }

  @action protected deleteDoc(doc: RelatedHermesDocument) {
    debugger;
    this.relatedDocuments.removeObject(doc);
    debugger;
    void this.saveProject.perform();
  }

  @action protected deleteRelatedLink(link: RelatedExternalLink) {
    this.relatedLinks.removeObject(link);
    void this.saveProject.perform();
  }

  protected saveProject = task(async () => {
    try {
      console.log("we here");
      await this.fetchSvc.fetch(`/api/v1/projects/${this.args.project.id}`, {
        method: "PATCH",
        body: JSON.stringify(this.formattedRelatedResources),
      });
    } catch (e: unknown) {
      console.log("error", e);
      // TODO: Handle error
    }
  });

  @action protected editResource(resource: RelatedResource) {
    console.log("editResource", resource);
  }

  /**
   * The action to add a resource to a document.
   * Adds a resource to the correct array, then saves it to the DB,
   * triggering a resource-highlight animation.
   */
  @action protected addDocument(resource: RelatedHermesDocument) {
    const cachedDocuments = this.relatedDocuments.slice();

    this.relatedDocuments.unshiftObject(resource);

    void this.saveRelatedResources.perform(
      cachedDocuments,
      this.relatedLinks.slice(),
      RelatedResourceSelector.HermesDocument,
    );
  }

  @action protected addLink(resource: RelatedExternalLink) {
    const cachedLinks = this.relatedLinks.slice();

    this.relatedLinks.unshiftObject(resource);

    void this.saveRelatedResources.perform(
      this.relatedDocuments.slice(),
      cachedLinks,
      RelatedResourceSelector.ExternalLink,
    );
  }

  /**
   * The related resources object, minimally formatted for a PUT request to the API.
   */
  private get formattedRelatedResources(): {
    hermesDocuments: Partial<RelatedHermesDocument>[];
    externalLinks: Partial<RelatedExternalLink>[];
  } {
    // this.updateSortOrder();

    const hermesDocuments = this.relatedDocuments.map((doc) => {
      return {
        googleFileID: doc.googleFileID,
        sortOrder: doc.sortOrder,
        // @ts-ignore
        product: doc.product,
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
        // void this.animateHighlight.perform(elementSelectorToHighlight);
      }

      try {
        await this.fetchSvc.fetch(`/api/v1/projects/${this.args.project.id}`, {
          method: "PUT",
          body: JSON.stringify(this.formattedRelatedResources),
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (e: unknown) {
        this.relatedLinks = cachedLinks;
        this.relatedDocuments = cachedDocuments;

        // this.flashMessages.add({
        //   title: "Unable to save resource",
        //   message: (e as any).message,
        //   type: "critical",
        //   sticky: true,
        //   extendedTimeout: 1000,
        // });
      }
    },
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Project: typeof ProjectIndexComponent;
  }
}
