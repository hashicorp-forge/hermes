import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
  RelatedResourcesScope,
} from "../related-resources";
import { service } from "@ember/service";
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
import { isTesting } from "@embroider/macros";
// TEMPORARILY USING STUBS FOR EMBER 6.x UPGRADE
import { TransitionContext, wait, fadeIn, fadeOut, move, Resize, easeOutExpo, easeOutQuad } from "hermes/utils/ember-animated-stubs";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import animateTransform from "hermes/utils/ember-animated/animate-transform";
import RouterService from "@ember/routing/router-service";
import StoreService from "hermes/services/store";

const animationDuration = isTesting() ? 0 : 450;

class ResizeExpo extends Resize {
  *animate() {
    this.opts.duration = animationDuration;
    this.opts.easing = easeOutExpo;
    yield* super.animate();
  }
}

class ResizeExpoSlow extends Resize {
  *animate() {
    this.opts.duration = animationDuration * 1.4;
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
  @service declare router: RouterService;
  @service declare store: StoreService;

  /**
   * The array of possible project statuses.
   * Used in the status dropdown.
   */
  protected statuses = projectStatusObjects;

  protected containerMotion = ResizeExpo;
  protected resourceListContainerMotion = ResizeExpoSlow;

  /**
   * Whether the list should animate.
   * Used to disable the animation on first render.
   */
  @tracked protected shouldAnimate = false;

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
   * A single array of all resources. Used by the "Add..." modal
   * to prevent duplicate resources from being added.
   */
  protected get relatedResources() {
    return [...this.hermesDocuments, ...this.externalLinks];
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
    } else {
      return false;
    }
  }

  /**
   * Whether the related resources should be shown.
   * True if the project has any related resources.
   */
  protected get resourcesAreShown() {
    if (this.externalLinks.length > 0 || this.hermesDocuments.length > 0) {
      return true;
    } else {
      return false;
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
      const index = this.hermesDocuments.indexOf(doc);
      if (index > -1) {
        this.hermesDocuments.splice(index, 1);
      }
    } else {
      const index = this.externalLinks.indexOf(doc);
      if (index > -1) {
        this.externalLinks.splice(index, 1);
      }
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
   * A triage method that saves the order of resources based on type.
   * Caches the current array, removes the target resource from the array,
   * inserts it at the new index, then patches the project.
   */
  @action private saveResourcesOrder(
    resourceType: RelatedResourcesScope,
    currentIndex: number,
    newIndex: number,
  ) {
    const isDoc = resourceType === RelatedResourcesScope.Documents;

    const cached = isDoc
      ? this.hermesDocuments.slice()
      : this.externalLinks.slice();

    const [removed] = isDoc
      ? this.hermesDocuments.splice(currentIndex, 1)
      : this.externalLinks.splice(currentIndex, 1);

    assert("removed must exist", removed);

    if (resourceType === RelatedResourcesScope.Documents) {
      assert("removed must be a document", "googleFileID" in removed);
      this.hermesDocuments.splice(newIndex, 0, removed);
      void this.saveProjectResources.perform(
        cached,
        this.externalLinks.slice(),
      );
    } else {
      assert("removed must be a link", "url" in removed);
      this.externalLinks.splice(newIndex, 0, removed);
      void this.saveProjectResources.perform(
        this.hermesDocuments.slice(),
        cached,
      );
    }
  }

  /**
   * The action to save the order of external links.
   * Called when the user reorders a link in the list.
   */
  @action protected saveLinkOrder(currentIndex: number, newIndex: number) {
    this.saveResourcesOrder(
      RelatedResourcesScope.ExternalLinks,
      currentIndex,
      newIndex,
    );
  }

  /**
   * The action to save the order of related documents.
   * Called when the user reorders a document in the list.
   */
  @action protected saveDocumentOrder(currentIndex: number, newIndex: number) {
    this.saveResourcesOrder(
      RelatedResourcesScope.Documents,
      currentIndex,
      newIndex,
    );
  }

  /**
   * The action to add a document to a project.
   * Adds a resource to the correct array, then saves the project.
   */
  @action protected addDocument(resource: RelatedHermesDocument) {
    const cachedDocuments = this.hermesDocuments.slice();

    this.hermesDocuments.unshift(resource);

    void this.saveProjectResources.perform(
      cachedDocuments,
      this.externalLinks.slice(),
    );
  }

  /**
   * The action to add a link to a project.
   * Adds a resource to the correct array, then saves the project.
   */
  @action protected addLink(resource: RelatedExternalLink) {
    const cachedLinks = this.externalLinks.slice();

    this.externalLinks.unshift(resource);

    void this.saveProjectResources.perform(
      this.hermesDocuments.slice(),
      cachedLinks,
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
    this.externalLinks = this.externalLinks.slice();

    void this.saveProjectResources.perform(
      this.hermesDocuments.slice(),
      cachedLinks,
    );

    this.editModalIsShown = false;
    this.resourceToEdit = undefined;
    this.resourceToEditIndex = undefined;
  }

  @action projectBodyTransitionRules({
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

    return this.projectBodyTransition;
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

  @action jiraTransitionRules({ firstTime }: { firstTime: boolean }) {
    // ignore animation on first render
    if (firstTime) {
      return emptyTransition;
    }

    // animate all other cases
    return this.jiraTransition;
  }

  *projectBodyTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    if (isTesting()) return;

    for (let sprite of insertedSprites) {
      yield wait(animationDuration * 0.1);
      void fadeIn(sprite, { duration: animationDuration * 0.35 });
    }

    for (let sprite of removedSprites) {
      void fadeOut(sprite, { duration: animationDuration * 0.05 });
    }
  }

  *descriptionTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    if (isTesting()) return;

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
    if (isTesting()) return;

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
    if (isTesting()) return;

    for (let sprite of insertedSprites) {
      yield wait(animationDuration * 0.3);

      void animateTransform(sprite, {
        scale: {
          from: 0.4,
          duration: animationDuration * 0.2,
        },
        rotate: {
          from: -10,
        },
        translate: {
          y: {
            from: 25,
          },
        },
        duration: animationDuration * 0.85,
        easing: easeOutExpo,
      });
      void fadeIn(sprite, { duration: animationDuration * 0.1 });
    }

    for (let sprite of removedSprites) {
      const duration = animationDuration * 0.3;
      const easing = easeOutQuad;

      void animateTransform(sprite, {
        scale: {
          to: 0.8,
        },
        rotate: {
          to: -70,
        },
        translate: {
          y: {
            to: 15,
          },
        },
        duration,
        easing,
      });

      void fadeOut(sprite, {
        duration,
        easing,
      });
    }
  }

  /**
   * The action to enable animations.
   * Called when the list is rendered, just
   * after the transitionRules have been set
   */
  @action protected enableAnimation() {
    this.shouldAnimate = true;
  }

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
        await Promise.all([savePromise, timeout(isTesting() ? 0 : 750)]);
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
    assert("jiraIssueID must exist", id);
    const issue = await this.store.findRecord("jira-issue", id);
    this.jiraIssue = issue;
  });

  /**
   * The task to save the document's related resources.
   * Creates a PUT request to the DB and conditionally triggers
   * the resource-highlight animation.
   */
  protected saveProjectResources = task(
    async (cachedDocuments, cachedLinks) => {
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
