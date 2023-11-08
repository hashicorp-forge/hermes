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
import { HermesProject, JiraIssue } from "hermes/types/project";
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";
import { assert } from "@ember/debug";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import ConfigService from "hermes/services/config";

interface ProjectIndexComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectIndexComponent extends Component<ProjectIndexComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
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
  @tracked protected jiraIssue?: JiraIssue = this.args.project.jiraIssue;
  @tracked protected hermesDocuments: RelatedHermesDocument[] =
    this.args.project.hermesDocuments ?? [];
  @tracked protected externalLinks: RelatedExternalLink[] =
    this.args.project.externalLinks ?? [];

  /**
   * Whether the "edit external link" modal is shown.
   */
  @tracked protected editModalIsShown = false;

  /**
   * The external link that's currently being edited.
   * Used by the modal to display current values and
   * run the save action.
   */
  @tracked protected resourceToEdit?: RelatedExternalLink;

  /**
   * The index of the resource to edit.
   * Used to update the resource in the array.
   */
  @tracked private resourceToEditIndex?: number;

  /**
   * The label for the status dropdown.
   * Represents the current status of the project.
   */
  protected get statusLabel() {
    return this.statuses[this.status].label;
  }

  /**
   * The icon for the status dropdown.
   * Represents the current status of the project.
   */
  protected get statusIcon() {
    return this.statuses[this.status].icon;
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
   * The action to run when the "edit external link" modal is dismissed.
   * Hides the modal and resets the local state.
   */
  @action protected hideEditModal(): void {
    this.editModalIsShown = false;
    this.resourceToEdit = undefined;
    this.resourceToEditIndex = undefined;
  }

  /**
   * The action to add a resource to a project.
   * Used by the `RelatedResources` component to add a resource.
   * Adds the resource to the correct array, then saves the project.
   */
  @action protected addResource(resource: RelatedResource): void {
    if ("googleFileID" in resource) {
      this.addDocument(resource);
    } else {
      this.addLink(resource);
    }
  }

  /**
   * The action to delete a resource from a project.
   * Accessible in the overflow menu of a project resource.
   * Removes the resource from the correct array, then saves the project.
   */
  @action protected deleteResource(doc: RelatedResource): void {
    const cachedDocuments = this.hermesDocuments.slice();
    const cachedLinks = this.externalLinks.slice();

    if ("googleFileID" in doc) {
      this.hermesDocuments.removeObject(doc);
    } else {
      this.externalLinks.removeObject(doc);
    }
    void this.saveRelatedResources.perform(cachedDocuments, cachedLinks);
  }

  /**
   * The action to change the project's status.
   * Updates the local status, then saves the project.
   * Runs when a user selects a new status from the dropdown.
   */
  @action protected changeStatus(status: ProjectStatus): void {
    this.status = status;
    void this.save.perform("status", status);
  }

  /**
   * The action to save the project's title.
   * Updates the local title, then saves the project.
   * Runs when the user accepts the EditableField changes.
   */
  @action protected saveTitle(newValue: string): void {
    this.title = newValue;
    void this.save.perform("title", newValue);
  }

  /**
   * The action to save the project's description.
   * Updates the local description, then saves the project.
   * Runs when the user accepts the EditableField changes.
   */
  @action protected saveDescription(newValue: string): void {
    this.description = newValue;
    void this.save.perform("description", newValue);
  }

  /**
   * TODO: Implement this.
   * ---------------------
   * The placeholder action for adding a Jira object.
   * Updates the local Jira object, then saves the project.
   */
  @action protected addJiraIssue(): void {
    // TODO: implement this
    this.jiraIssue = {
      key: "HER-123",
      url: "https://www.google.com",
      priority: "High",
      status: "Open",
      type: "Bug",
      summary: "Vault Data Gathering Initiative: Support",
      assignee: "John Dobis",
    };
    void this.save.perform("jiraIssue", this.jiraIssue);
  }

  /**
   * The action to remove a Jira object from a project.
   * Updates the local Jira object, then saves the project.
   * Accessible in the overflow menu of a project resource.
   */
  @action protected removeJiraIssue(): void {
    this.jiraIssue = undefined;
    void this.save.perform("jiraIssue", undefined);
  }

  /**
   * The action to show the "edit external link" modal.
   * Run when a user clicks the "edit" button in the overflow menu.
   * Sets the local resource references and shows the modal.
   */
  @action protected showEditModal(resource: RelatedResource, index: number) {
    this.resourceToEdit = resource as RelatedExternalLink;
    this.resourceToEditIndex = index;
    this.editModalIsShown = true;
  }

  /**
   * The action to add a document to a project.
   * Adds a resource to the correct array, then saves the project.
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

  /**
   * The action to add a link to a project.
   * Adds a resource to the correct array, then saves the project.
   */
  @action protected addLink(resource: RelatedExternalLink) {
    const cachedLinks = this.externalLinks.slice();

    this.externalLinks.unshiftObject(resource);

    void this.saveRelatedResources.perform(
      this.hermesDocuments.slice(),
      cachedLinks,
      RelatedResourceSelector.ExternalLink,
    );
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
   * The action to save the project.
   * Runs when the user adds, removes, or otherwise changes a project attribute.
   *
   * TODO: Explain why this is a PATCH request.
   */
  protected save = task(async (key?: string, newValue?: string | JiraIssue) => {
    try {
      const valueToSave = key
        ? { [key]: newValue }
        : this.formattedRelatedResources;
      await this.fetchSvc.fetch(`/api/v1/projects/${this.args.project.id}`, {
        method: "PATCH",
        body: JSON.stringify(valueToSave),
      });
    } catch (e: unknown) {
      this.flashMessages.add({
        title: "Unable to save",
        message: (e as any).message,
        type: "critical",
        timeout: 10000,
        extendedTimeout: 1000,
      });
    }
  });

  /**
   * The task to save the document's related resources.
   * Creates a PUT request to the DB and conditionally triggers
   * the resource-highlight animation.
   *
   * TODO: Explain why this is a PUT request.
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
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/projects/${this.args.project.id}/related-resources`,
          {
            method: "PUT",
            body: JSON.stringify(this.formattedRelatedResources),
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
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
