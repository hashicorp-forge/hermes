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
import { ProjectStatus } from "hermes/types/project-status";
import { assert } from "@ember/debug";

interface ProjectIndexComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectIndexComponent extends Component<ProjectIndexComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked relatedDocuments = this.args.project.hermesDocuments ?? [];
  @tracked relatedLinks: RelatedExternalLink[] =
    this.args.project.externalLinks ?? [];

  @tracked title = this.args.project.title;
  @tracked description = this.args.project.description;
  @tracked jiraObject: JiraObject | undefined = this.args.project.jiraObject;

  @tracked protected editModalIsShown = false;

  @tracked protected resourceToEdit: RelatedExternalLink | undefined;
  @tracked protected resourceToEditIndex: number | undefined;

  protected get sortedResources(): RelatedResource[] {
    let array: RelatedResource[] = [];
    return array.concat(this.relatedDocuments, this.relatedLinks);
  }

  @tracked protected status = this.args.project.status;

  statuses = {
    [ProjectStatus.Active]: {
      label: "Active",
      icon: "circle-dot",
    },
    [ProjectStatus.Completed]: {
      label: "Completed",
      icon: "check-circle",
    },
    [ProjectStatus.Archived]: {
      label: "Archived",
      icon: "archive",
    },
  };

  get statusLabel() {
    return this.statuses[this.status].label;
  }

  get statusIcon() {
    return this.statuses[this.status].icon;
  }

  get products() {
    // should this be sorted?
    return this.relatedDocuments
      .reverse()
      .map((doc) => doc.product)
      .uniq();
  }

  @action hideEditModal() {
    this.editModalIsShown = false;
    this.resourceToEdit = undefined;
    this.resourceToEditIndex = undefined;
  }

  @action protected addResource(resource: RelatedResource) {
    if ("googleFileID" in resource) {
      this.addDocument(resource as RelatedHermesDocument);
    } else {
      this.addLink(resource as RelatedExternalLink);
    }
    void this.save.perform();
  }

  @action protected deleteResource(doc: RelatedResource) {
    if ("googleFileID" in doc) {
      this.relatedDocuments.removeObject(doc as RelatedHermesDocument);
    } else {
      this.relatedLinks.removeObject(doc as RelatedExternalLink);
    }
    void this.save.perform();
  }

  @action protected changeStatus(status: ProjectStatus) {
    this.status = status;
    void this.save.perform("status", status);
  }

  @action protected saveTitle(newValue: string) {
    this.title = newValue;
    void this.save.perform("title", newValue);
  }

  @action protected saveDescription(newValue: string) {
    this.description = newValue;
    void this.save.perform("description", newValue);
  }

  @action protected archiveProject() {
    void this.save.perform("status", ProjectStatus.Archived);
  }

  @action protected completeProject() {
    void this.save.perform("status", ProjectStatus.Completed);
  }

  @action protected addJiraLink() {
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

  @action protected removeJiraLink() {
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
          this.relatedDocuments = this.args.project.hermesDocuments ?? [];
          this.relatedLinks = this.args.project.externalLinks ?? [];
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
        ...doc,
        googleFileID: doc.googleFileID,
        sortOrder: doc.sortOrder,
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

  @action protected saveExternalLink(link: RelatedExternalLink) {
    const cachedLinks = this.relatedLinks.slice();

    assert(
      "resourceToEditIndex must exist",
      this.resourceToEditIndex !== undefined,
    );

    this.relatedLinks[this.resourceToEditIndex] = link;

    // Replacing an individual link doesn't cause the getter
    // to recompute, so we manually save the array.
    this.relatedLinks = this.relatedLinks;

    void this.saveRelatedResources.perform(
      this.relatedDocuments.slice(),
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
