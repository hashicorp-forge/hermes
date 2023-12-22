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
import { enqueueTask, task, timeout } from "ember-concurrency";
import { HermesProject, JiraPickerResult } from "hermes/types/project";
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";
import { assert } from "@ember/debug";
import ConfigService from "hermes/services/config";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import { FLASH_MESSAGES_LONG_TIMEOUT } from "hermes/utils/ember-cli-flash/timeouts";
import updateRelatedResourcesSortOrder from "hermes/utils/update-related-resources-sort-order";
import Ember from "ember";
import { TransitionContext, wait } from "ember-animated/.";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import move from "ember-animated/motions/move";
import { Resize } from "ember-animated/motions/resize";
import { easeOutExpo, easeOutQuad } from "hermes/utils/ember-animated/easings";
import animateRotation from "hermes/utils/ember-animated/animate-rotation";

const animationDuration = Ember.testing ? 0 : 450;

class ResizeProject extends Resize {
  *animate() {
    console.log("resize");
    this.opts.duration = animationDuration;
    this.opts.easing = easeOutExpo;
    yield* super.animate();
  }
}

interface ProjectIndexComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectIndexComponent extends Component<ProjectIndexComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare flashMessages: HermesFlashMessagesService;

  /**
   * The array of possible project statuses.
   * Used in the status dropdown.
   */
  protected statuses = projectStatusObjects;

  protected motion = ResizeProject;

  /**
   * Locally tracked project attributes.
   * Initially set to the project's attributes;
   * updated as the user makes changes.
   */
  @tracked protected title = this.args.project.title;
  @tracked protected description = this.args.project.description;
  @tracked protected status = this.args.project.status;

  @tracked protected jiraIssue?: JiraPickerResult;
  @tracked protected hermesDocuments: RelatedHermesDocument[] =
    this.args.project.hermesDocuments ?? [];
  @tracked protected externalLinks: RelatedExternalLink[] =
    this.args.project.externalLinks ?? [];

  @tracked titleIsSaving = false;
  @tracked descriptionIsSaving = false;

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
   * Whether Jira is configured for the project.
   * Determines whether to show the Jira-related UI.
   */
  protected get jiraIsEnabled() {
    return !!this.configSvc.config.jira_url;
  }

  /**
   * The label for the status dropdown.
   * Represents the current status of the project.
   */
  protected get statusLabel() {
    return this.statuses[this.status].label;
  }

  /**
   * The URL of the project. Used by the CopyURLButton.
   */
  protected get url() {
    return window.location.href;
  }

  /**
   * Whether the project is in the "active" state.
   * Determines if project metadata is editable.
   */
  protected get projectIsActive() {
    return this.status === ProjectStatus.Active;
  }

  /**
   * Whether the JiraWidget should be shown.
   * True if the project is active, or if the project has a Jira issue
   * (that may or may not be loading)
   */
  protected get jiraWidgetIsShown() {
    /**
     * This construction is weird, but it gives us
     * the most accurate evaluations by `ember-animated`
     * and prevents unnecessary re-renders.
     */
    if (
      !!this.jiraIssue ||
      this.projectIsActive ||
      this.loadJiraIssue.isRunning
    ) {
      return true;
    }
  }

  /**
   * The related resources object, minimally formatted for a PUT request to the API.
   */
  private get formattedRelatedResources(): {
    hermesDocuments: Partial<RelatedHermesDocument>[];
    externalLinks: Partial<RelatedExternalLink>[];
  } {
    updateRelatedResourcesSortOrder(this.hermesDocuments, this.externalLinks);

    const hermesDocuments = this.hermesDocuments.map((doc) => {
      return {
        googleFileID: doc.googleFileID,
        sortOrder: doc.sortOrder,
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
   * The action to kick off the Jira issue loading task.
   * Runs when the component is inserted and the project has a Jira issue.
   */
  @action maybeLoadJiraInfo() {
    if (this.args.project.jiraIssueID) {
      // kick off a task to load the jira issue
      void this.loadJiraIssue.perform();
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
    void this.saveProjectResources.perform(cachedDocuments, cachedLinks);
  }

  /**
   * The action to change the project's status.
   * Updates the local status, then saves the project.
   * Runs when a user selects a new status from the dropdown.
   */
  @action protected changeStatus(status: ProjectStatus): void {
    this.status = status;
    void this.saveProjectInfo.perform("status", status);
  }

  /**
   * The action to save the project's title.
   * Updates the local title, then saves the project.
   * Runs when the user accepts the EditableField changes.
   */
  @action protected saveTitle(newValue: string): void {
    this.title = newValue;
    this.titleIsSaving = true;
    void this.saveProjectInfo.perform("title", newValue);
  }

  /**
   * The action to save the project's description.
   * Updates the local description, then saves the project.
   * Runs when the user accepts the EditableField changes.
   */
  @action protected saveDescription(newValue: string): void {
    this.description = newValue;
    this.descriptionIsSaving = true;
    void this.saveProjectInfo.perform("description", newValue);
  }

  /**
   * The action for adding a Jira object, passed to the JiraWidget
   * as `onIssueSelect`. Updates the local Jira object,
   * then saves the project.
   */
  @action protected addJiraIssue(issue: JiraPickerResult): void {
    this.jiraIssue = issue;
    void this.saveProjectInfo.perform("jiraIssueID", issue.key);
    void this.loadJiraIssue.perform(issue.key);
  }

  /**
   * The action to remove a Jira object from a project.
   * Updates the local Jira object, then saves the project.
   * Accessible in the overflow menu of a project resource.
   */
  @action protected removeJiraIssue(): void {
    this.jiraIssue = undefined;
    void this.saveProjectInfo.perform("jiraIssueID", "");
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
    void this.getOwnerPhoto.perform(resource.googleFileID);

    const cachedDocuments = this.hermesDocuments.slice();

    this.hermesDocuments.unshiftObject(resource);

    void this.saveProjectResources.perform(
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

    void this.saveProjectResources.perform(
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

    void this.saveProjectResources.perform(
      this.hermesDocuments.slice(),
      cachedLinks,
      this.resourceToEditIndex,
    );

    this.editModalIsShown = false;
    this.resourceToEdit = undefined;
    this.resourceToEditIndex = undefined;
  }

  @action plusButtonTransitionRules({
    firstTime,
    oldItems,
    newItems,
  }: {
    firstTime: boolean;
    oldItems: unknown[];
    newItems: unknown[];
  }) {
    // ignore animation on first render
    if (firstTime) {
      return emptyTransition;
    }
    // ignore animation when leaving the project
    if (oldItems[0] === true && newItems[0] === undefined) {
      return emptyTransition;
    }

    // animate all other cases
    return this.plusButtonTransition;
  }

  @action descriptionTransitionRules({ firstTime }: { firstTime: boolean }) {
    if (firstTime) {
      return emptyTransition;
    }
    return this.descriptionTransition;
  }

  @action jiraTransitionRules({
    firstTime,
    oldItems,
    newItems,
  }: {
    firstTime: boolean;
    oldItems: unknown[];
    newItems: unknown[];
  }) {
    // ignore animation on first render
    if (firstTime) {
      return emptyTransition;
    }

    // animate all other cases
    return this.jiraTransition;
  }

  *descriptionTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    if (Ember.testing) return;

    for (let sprite of insertedSprites) {
      yield wait(animationDuration * 0.01);
      void fadeIn(sprite, { duration: animationDuration * 0.25 });
    }
    for (let sprite of removedSprites) {
      yield wait(animationDuration * 0.0025);
      void fadeOut(sprite, { duration: animationDuration * 0.075 });
    }
  }

  *jiraTransition({ insertedSprites, removedSprites }: TransitionContext) {
    if (Ember.testing) return;

    for (let sprite of insertedSprites) {
      yield wait(animationDuration * 0.1);
      void fadeIn(sprite, { duration: animationDuration * 0.35 });
    }

    for (let sprite of removedSprites) {
      sprite.endTranslatedBy(0, -30);
      void move(sprite, {
        duration: animationDuration,
        easing: easeOutExpo,
      });
      void fadeOut(sprite, { duration: animationDuration * 0.05 });
    }
  }

  *plusButtonTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    if (Ember.testing) return;

    for (let sprite of insertedSprites) {
      sprite.startTranslatedBy(0, 20);
      yield wait(animationDuration * 0.3);
      void move(sprite, {
        duration: animationDuration * 0.5,
        easing: easeOutExpo,
      });
      void fadeIn(sprite, { duration: animationDuration * 0.1 });
    }

    for (let sprite of removedSprites) {
      sprite.endTranslatedBy(0, 20);
      void move(sprite, {
        duration: animationDuration * 0.5,
        easing: easeOutExpo,
      });
      yield wait(animationDuration * 0.15);
      void fadeOut(sprite, { duration: animationDuration * 0.1 });
    }
  }

  /**
   * The task to get the owner photo for a document.
   */
  private getOwnerPhoto = enqueueTask(async (docID: string) => {
    const doc = await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/documents/${docID}`)
      .then((response) => response?.json());

    const ownerPhoto = doc.ownerPhotos[0];

    if (ownerPhoto) {
      const hermesDoc = this.hermesDocuments.find(
        (doc) => doc.googleFileID === docID,
      );

      if (hermesDoc) {
        hermesDoc.ownerPhotos = [ownerPhoto];
      }
    }
  });

  /**
   * The action to save basic project attributes,
   * such as title, description, and status.
   */
  protected saveProjectInfo = enqueueTask(
    async (key: string, newValue?: string) => {
      try {
        const valueToSave = { [key]: newValue };

        const savePromise = this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/projects/${this.args.project.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(valueToSave),
          },
        );
        await Promise.all([savePromise, timeout(Ember.testing ? 0 : 750)]);
      } catch (e) {
        this.flashMessages.critical((e as any).message, {
          title: "Unable to save",
          timeout: FLASH_MESSAGES_LONG_TIMEOUT,
        });
      } finally {
        switch (key) {
          case "title":
            this.titleIsSaving = false;
            break;
          case "description":
            this.descriptionIsSaving = false;
            break;
        }
      }
    },
  );

  /**
   * The task to load a Jira issue from an ID.
   * Used to populate the JiraWidget when the component is inserted,
   * or when a user adds a Jira issue to a project.
   */
  loadJiraIssue = task(async (jiraIssueID?: string) => {
    const id = jiraIssueID ?? this.args.project.jiraIssueID;
    const issue = await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/jira/issues/${id}`)
      .then((response) => response?.json());
    this.jiraIssue = issue;
  });

  /**
   * The task to save the document's related resources.
   * Creates a PUT request to the DB and conditionally triggers
   * the resource-highlight animation.
   */
  protected saveProjectResources = task(
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
      } catch (e) {
        this.externalLinks = cachedLinks;
        this.hermesDocuments = cachedDocuments;

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
    Project: typeof ProjectIndexComponent;
  }
}
