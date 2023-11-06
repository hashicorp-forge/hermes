import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
} from "../related-resources";
import { RelatedResourceSelector } from "hermes/components/related-resources";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import { task } from "ember-concurrency";
import { HermesProject, JiraObject } from "hermes/types/project";
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";
import { assert } from "@ember/debug";
import FlashMessageService from "ember-cli-flash/services/flash-messages";

interface ProjectIndexComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectIndexComponent extends Component<ProjectIndexComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flashMessages: FlashMessageService;

  /**
   * The array of possible project statuses.
   * Used in the status dropdown.
   */
  protected statuses = projectStatusObjects;

  /**
   * Locally tracked project attributes.
   * Initially set to the project's attributes;
   * updated as the user makes changes.
   */
  @tracked protected title = this.args.project.title;
  @tracked protected description = this.args.project.description;
  @tracked protected status = this.args.project.status;
  @tracked protected jiraObject?: JiraObject = this.args.project.jiraObject;
  @tracked protected hermesDocuments: RelatedHermesDocument[] =
    this.args.project.hermesDocuments ?? [];
  @tracked protected externalLinks: RelatedExternalLink[] =
    this.args.project.externalLinks ?? [];

  @tracked protected editModalIsShown = false;
  @tracked protected resourceToEdit?: RelatedExternalLink;
  @tracked protected resourceToEditIndex?: number;

  protected get sortedResources(): RelatedResource[] {
    let array: RelatedResource[] = [];
    return array.concat(this.hermesDocuments, this.externalLinks);
  }

  protected get statusLabel() {
    return this.statuses[this.status].label;
  }

  protected get statusIcon() {
    return this.statuses[this.status].icon;
  }

  protected get products() {
    return this.hermesDocuments
      .reverse()
      .map((doc) => doc.product)
      .uniq();
  }

  @action protected hideEditModal(): void {
    this.editModalIsShown = false;
    this.resourceToEdit = undefined;
    this.resourceToEditIndex = undefined;
  }

  @action protected addResource(resource: RelatedResource): void {
    if ("googleFileID" in resource) {
      this.addDocument(resource);
    } else {
      this.addLink(resource);
    }
    void this.save.perform();
  }

  @action protected deleteResource(doc: RelatedResource): void {
    if ("googleFileID" in doc) {
      this.hermesDocuments.removeObject(doc);
    } else {
      this.externalLinks.removeObject(doc);
    }
    void this.save.perform();
  }

  @action protected changeStatus(status: ProjectStatus): void {
    this.status = status;
    void this.save.perform("status", status);
  }

  @action protected saveTitle(newValue: string): void {
    this.title = newValue;
    void this.save.perform("title", newValue);
  }

  @action protected saveDescription(newValue: string): void {
    this.description = newValue;
    void this.save.perform("description", newValue);
  }

  @action protected archiveProject(): void {
    void this.save.perform("status", ProjectStatus.Archived);
  }

  @action protected completeProject(): void {
    void this.save.perform("status", ProjectStatus.Completed);
  }

  @action protected addJiraLink(): void {
    // TODO: implement this
    this.jiraObject = {
      key: "HER-123",
      url: "https://www.google.com",
      priority: "High",
      status: "Open",
      type: "Bug",
      summary: "Vault Data Gathering Initiative: Support",
      assignee: "John Dobis",
    };
    void this.save.perform("jiraObject", this.jiraObject);
  }

  @action protected removeJiraLink(): void {
    this.jiraObject = undefined;
    void this.save.perform("jiraObject", undefined);
  }

  protected save = task(
    async (key?: string, newValue?: string | JiraObject) => {
      try {
        const valueToSave = key
          ? { [key]: newValue }
          : this.formattedRelatedResources;
        await this.fetchSvc.fetch(`/api/v1/projects/${this.args.project.id}`, {
          method: "PATCH",
          body: JSON.stringify(valueToSave),
        });
      } catch (e: unknown) {
        if (key) {
          switch (key) {
            case "title":
              this.title = this.args.project.title;
              break;
            case "description":
              this.description = this.args.project.description;
              break;
          }
        } else {
          this.hermesDocuments = this.args.project.hermesDocuments ?? [];
          this.externalLinks = this.args.project.externalLinks ?? [];
        }
      }
    },
  );

  @action protected showEditModal(resource: RelatedResource, index: number) {
    this.resourceToEdit = resource as RelatedExternalLink;
    this.resourceToEditIndex = index;
    this.editModalIsShown = true;
  }

  /**
   * The action to add a document to a project.
   * Adds a resource to the correct array, then saves it to the DB.
   */
  @action protected addDocument(resource: RelatedHermesDocument) {
    const cachedDocuments = this.hermesDocuments.slice();

    this.hermesDocuments.unshiftObject(resource);

    void this.saveRelatedResources.perform(
      cachedDocuments,
      this.externalLinks.slice(),
      RelatedResourceSelector.HermesDocument,
    );
  }

  @action protected addLink(resource: RelatedExternalLink) {
    const cachedLinks = this.externalLinks.slice();

    this.externalLinks.unshiftObject(resource);

    void this.saveRelatedResources.perform(
      this.hermesDocuments.slice(),
      cachedLinks,
      RelatedResourceSelector.ExternalLink,
    );
  }

  /**
   * The action to update the `sortOrder` attribute of
   * the resources, based on their position in the array.
   * Called when the resource list is saved.
   */
  private updateSortOrder() {
    this.hermesDocuments.forEach((doc, index) => {
      doc.sortOrder = index + 1;
    });

    this.externalLinks.forEach((link, index) => {
      link.sortOrder = index + 1 + this.hermesDocuments.length;
    });
  }

  /**
   * The related resources object, minimally formatted for a PUT request to the API.
   */
  private get formattedRelatedResources(): {
    hermesDocuments: Partial<RelatedHermesDocument>[];
    externalLinks: Partial<RelatedExternalLink>[];
  } {
    this.updateSortOrder();

    const hermesDocuments = this.hermesDocuments.map((doc) => {
      return {
        ...doc,
        googleFileID: doc.googleFileID,
        sortOrder: doc.sortOrder,
        product: doc.product,
      };
    });

    const externalLinks = this.externalLinks.map((link) => {
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

  @action protected saveExternalLink(link: RelatedExternalLink) {
    const cachedLinks = this.externalLinks.slice();

    assert(
      "resourceToEditIndex must exist",
      this.resourceToEditIndex !== undefined,
    );

    this.externalLinks[this.resourceToEditIndex] = link;

    // Replacing an individual link doesn't cause the getter
    // to recompute, so we manually save the array.
    this.externalLinks = this.externalLinks;

    void this.saveRelatedResources.perform(
      this.hermesDocuments.slice(),
      cachedLinks,
      this.resourceToEditIndex,
    );

    this.editModalIsShown = false;
    this.resourceToEdit = undefined;
    this.resourceToEditIndex = undefined;
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
        this.externalLinks = cachedLinks;
        this.hermesDocuments = cachedDocuments;

        this.flashMessages.add({
          title: "Unable to save resource",
          message: (e as any).message,
          type: "critical",
          sticky: true,
          extendedTimeout: 1000,
        });
      }
    },
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Project: typeof ProjectIndexComponent;
  }
}
