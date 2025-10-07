import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { getOwner } from "@ember/application";
import { service } from "@ember/service";
import {
  dropTask,
  enqueueTask,
  keepLatestTask,
  restartableTask,
  task,
  timeout,
} from "ember-concurrency";
import { capitalize } from "@ember/string";
import cleanString from "hermes/utils/clean-string";
import { debounce, schedule } from "@ember/runloop";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";
import { CustomEditableField, HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import Route from "@ember/routing/route";
import { isTesting } from "@embroider/macros";
import htmlElement from "hermes/utils/html-element";
import ConfigService from "hermes/services/config";
import isValidURL from "hermes/utils/is-valid-u-r-l";
import { HermesDocumentType } from "hermes/types/document-type";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import {
  HermesProjectInfo,
  HermesProjectResources,
} from "hermes/types/project";
import updateRelatedResourcesSortOrder from "hermes/utils/update-related-resources-sort-order";
import { ProjectStatus } from "hermes/types/project-status";
import { RelatedHermesDocument } from "../related-resources";
import PersonModel from "hermes/models/person";
import RecentlyViewedService from "hermes/services/recently-viewed";
import StoreService from "hermes/services/store";
import ModalAlertsService, { ModalType } from "hermes/services/modal-alerts";

interface DocumentSidebarComponentSignature {
  Args: {
    profile: PersonModel;
    document: HermesDocument;
    docType: Promise<HermesDocumentType>;
    isCollapsed: boolean;
    viewerIsGroupApprover: boolean;
    toggleCollapsed: () => void;
  };
}

export enum DraftVisibility {
  Restricted = "restricted",
  Shareable = "shareable",
}

export enum DraftVisibilityIcon {
  Restricted = "lock",
  Shareable = "enterprise",
  Loading = "loading",
}

export enum DraftVisibilityDescription {
  Restricted = "Only you and the people you add can view and edit this doc.",
  Shareable = "Editing is restricted, but anyone in the organization with the link can view.",
}

const SHARE_BUTTON_SELECTOR = "#sidebar-header-copy-url-button";

export default class DocumentSidebarComponent extends Component<DocumentSidebarComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare recentlyViewed: RecentlyViewedService;
  @service declare router: RouterService;
  @service declare session: SessionService;
  @service declare store: StoreService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare modalAlerts: ModalAlertsService;

  /**
   * The ID shared between the "Select a new owner" PeopleSelect and its label.
   */
  protected transferOwnershipPeopleSelectID =
    "transfer-ownership-people-select";

  @tracked deleteModalIsShown = false;
  @tracked requestReviewModalIsShown = false;
  @tracked docPublishedModalIsShown = false;
  @tracked protected transferOwnershipModalIsShown = false;
  @tracked protected projectsModalIsShown = false;
  @tracked docTypeCheckboxValue = false;

  @tracked protected docType: HermesDocumentType | null = null;

  // TODO: This state tracking could be improved with a document model
  // (not necessarily, an ember data model, but some sort of tracking-aware
  // class to stuff this in instead of passing a POJO around).
  @tracked title = this.args.document.title || "";
  @tracked summary = this.args.document.summary || "";
  @tracked contributors: string[] = this.args.document.contributors || [];
  @tracked product = this.args.document.product || "";
  @tracked status = this.args.document.status;

  /**
   * A locally tracked array of approvers. Used to update the UI immediately
   * instead of waiting for the back end to confirm the change.
   */
  @tracked approvers: string[] = this.args.document.approvers || [];

  /**
   * A locally tracked array of approverGroups. Used to update the UI immediately
   * instead of waiting for the back end to confirm the change.
   */

  @tracked approverGroups: string[] = this.args.document.approverGroups || [];

  /**
   * Whether the user has left the approver role since page load.
   * Dictates the "leaving..." state of the footer.
   */
  @tracked protected hasJustLeftApproverRole = false;

  /**
   * Projects this document is associated with.
   * Set by `loadRelatedProjects` and used to render a list
   * of projects or an empty state.
   */
  @tracked protected _projects: Array<HermesProjectInfo> | null = null;

  /**
   * Whether a draft was published during the session.
   * Set true when the user successfully requests a review.
   * Used in the `isDraft` getter to immediately update the UI
   * to reflect the new state of the document.
   */
  @tracked private draftWasPublished: boolean | null = null;

  /**
   * Whether the `waitForDocNumber` task has has failed to find a docNumber.
   * When true, the "doc published" modal will not show a URL or share button.
   */
  @tracked protected docNumberLookupHasFailed = false;

  /**
   * Whether the draft's `isShareable` property is true.
   * Checked on render and changed when the user toggles permissions.
   * Used to
   */
  @tracked private _docIsShareable = false;

  /**
   * The icon of a new draft visibility. Set immediately when
   * a draft-visibility option is selected and removed when the
   * request finally completes. Used to reactively update the UI.
   */
  @tracked private newDraftVisibilityIcon: DraftVisibilityIcon | null = null;

  /**
   * Whether the Approvers list is shown.
   * True except immediately after the user leaves the approver role.
   * See note in `toggleApproverVisibility` for more information.
   */
  @tracked protected approversAreShown = true;

  /**
   * Whether an error is shown in the projects section.
   * True when the `loadRelatedProjects` task fails.
   * Reset when the user retries the request.
   */
  @tracked protected projectsErrorIsShown = false;

  /**
   * The new owner of the document.
   * Set when the user selects a new owner from the "Transfer ownership" modal.
   */
  @tracked private newOwners: string[] = [];

  /**
   * The `TypeToConfirm` input of the "Transfer ownership" modal.
   * Registered on insert and focused when the user selects a new owner.
   */
  @tracked protected typeToConfirmInput: HTMLInputElement | null = null;

  /**
   * Whether the "Ownership transferred" modal is shown.
   * True when the `transferOwnership` task completes successfully.
   */
  @tracked protected ownershipTransferredModalIsShown = false;

  /**
   * Whether the user has scrolled the sidebar. When true,
   * adds a border to the header to indicate scroll state.
   */
  @tracked protected userHasScrolled = false;

  /**
   * The scrollable body element. Its `scrollTop` property is used
   * to determine the scroll state of the sidebar.
   */
  @tracked private body: HTMLElement | null = null;

  /**
   * Whether the document is locked to editing.
   * True when a document is corrupt or has suggestions in the header.
   * Initially set to the passed-in property; set true when a 423 is thrown.
   */
  @tracked protected docIsLocked = this.args.document?.locked;

  /**
   * Whether the viewer has approved the document.
   * True if their email is in the document's `approvedBy` array,
   * and immediately when their approval completes.
   */
  @tracked protected hasApproved = this.args.document.approvedBy?.includes(
    this.args.profile.email,
  );

  /**
   * Whether the viewer has requested changes to the document.
   * True if their email is in the document's `changesRequestedBy` array,
   * and immediately when their request completes.
   */
  @tracked protected hasRejectedFRD =
    this.args.document.changesRequestedBy?.includes(this.args.profile.email);

  /**
   * Whether the doc is a draft.
   * If the draft was recently published, return false.
   * Otherwise use the passed-in isDraft property.
   */
  protected get isDraft() {
    return this.draftWasPublished ? false : this.args.document?.isDraft;
  }

  /**
   * The ID of the document. Used in API requests.
   */
  private get docID() {
    return this.args.document?.objectID;
  }

  /**
   * All active projects. Used to render the list of
   * options for the "add to project" modal.
   */
  protected get projects() {
    return this._projects?.filter((project) => {
      return (
        project.status === ProjectStatus.Active ||
        project.status === ProjectStatus.Completed
      );
    });
  }

  /**
   * Whether the draft is shareable.
   * Used to identify the draft-visibility options
   * and determine which to show as checked.
   */
  protected get draftVisibility(): DraftVisibility {
    return this.draftIsShareable
      ? DraftVisibility.Shareable
      : DraftVisibility.Restricted;
  }

  /**
   * The context-specific text of the draft-visibility toggle.
   */
  protected get toggleDraftVisibilityTooltipText() {
    if (this.draftVisibilityIcon === DraftVisibilityIcon.Restricted) {
      return capitalize(DraftVisibility.Restricted);
    } else {
      return capitalize(DraftVisibility.Shareable);
    }
  }

  /**
   * The icon shown in the draft-visibility toggle.
   * If the initial draft permissions are loading, show a loading icon.
   * If the user has selected a new draft visibility, show that icon.
   * Otherwise, show the saved draft visibility icon.
   */
  protected get draftVisibilityIcon(): DraftVisibilityIcon {
    if (this.getDraftPermissions.isRunning) {
      return DraftVisibilityIcon.Loading;
    }
    if (this.newDraftVisibilityIcon) {
      return this.newDraftVisibilityIcon;
    }
    return this.draftIsShareable
      ? DraftVisibilityIcon.Shareable
      : DraftVisibilityIcon.Restricted;
  }

  /**
   * The URL that the copyURLButton should copy to the clipboard.
   * If the document is a draft, this is the current window location.
   * If the doc is published, use the short link if it's available,
   * otherwise use the current window location.s
   */
  protected get shareURL() {
    // We only assign shortLinks to published documents
    if (this.isDraft) {
      return window.location.href;
    }

    let shortLinkBaseURL: string | undefined =
      this.configSvc.config.short_link_base_url;

    if (shortLinkBaseURL) {
      // Add a trailing slash if the URL needs one
      if (!shortLinkBaseURL.endsWith("/")) {
        shortLinkBaseURL += "/";
      }
      // Reject invalid URLs
      if (!isValidURL(shortLinkBaseURL)) {
        shortLinkBaseURL = undefined;
      }
    }

    return shortLinkBaseURL
      ? `${
          shortLinkBaseURL + this.args.document.docType.toLowerCase()
        }/${this.args.document.docNumber.toLowerCase()}`
      : window.location.href;
  }

  /**
   * Whether the share button should be shown.
   * True if the document is published or the draft is shareable.
   * False otherwise.
   */
  protected get shareButtonIsShown(): boolean | undefined {
    if (!this.isDraft) {
      // Let the child component decide.
      return;
    }
    if (this._docIsShareable) {
      return true;
    }
    return false;
  }

  /**
   * Whether the draft is shareable.
   * True if the document is a draft and `isShareable`.
   */
  private get draftIsShareable() {
    return this.isDraft && this._docIsShareable;
  }

  /**
   * The custom editable fields for the document.
   * Looped through in the template to render the fields.
   */
  protected get customEditableFields() {
    let customEditableFields = this.args.document.customEditableFields || {};
    for (const field in customEditableFields) {
      // @ts-ignore - TODO: Type this
      customEditableFields[field]["value"] = this.args.document[field];
    }
    return customEditableFields;
  }

  /**
   * The items passed to the draft-visibility dropdown.
   * Used to render the dropdown items and react to item selection.
   */
  protected get draftVisibilityOptions() {
    return {
      [DraftVisibility.Restricted]: {
        // need to uppercase the first letter of the title
        title: capitalize(DraftVisibility.Restricted),
        icon: DraftVisibilityIcon.Restricted,
        description: DraftVisibilityDescription.Restricted,
      },
      [DraftVisibility.Shareable]: {
        title: capitalize(DraftVisibility.Shareable),
        icon: DraftVisibilityIcon.Shareable,
        description: DraftVisibilityDescription.Shareable,
      },
    };
  }

  protected get requestReviewBulletPoints() {
    return [
      {
        icon: "at-sign",
        text: `Approvers and people subscribed to “${this.args.document.product}” will be notified.`,
      },
      {
        icon: "radio",
        text: "Your document will appear in Hermes and Google Workspace search.",
      },
      {
        icon: "globe-private",
        text: "Published documents cannot be deleted but can be archived.",
      },
    ];
  }

  /**
   * Whether the share button is in the process of creating a shareable link.
   * Used to determine the icon and tooltip text of the share button.
   */
  private get isCreatingShareLink() {
    return (
      this.setDraftVisibility.isRunning &&
      this.newDraftVisibilityIcon === DraftVisibilityIcon.Shareable
    );
  }

  /**
   * The tooltip text to show in the share button
   * while the user is creating or has recently created a shareable link.
   */
  protected get temporaryShareButtonTooltipText() {
    if (this.isCreatingShareLink) {
      return "Creating link...";
    }
    if (this.showCreateLinkSuccessMessage.isRunning) {
      return "Link created!";
    }
  }

  /**
   * The icon to show in the share button while the user is
   * creating a shareable link. Shows the "running" animation while
   * the request works; switches to a "smile" when the request completes.
   */
  protected get temporaryShareButtonIcon() {
    if (this.isCreatingShareLink) {
      return "running";
    }
    if (this.showCreateLinkSuccessMessage.isRunning) {
      return "smile";
    }
  }

  /**
   * Whether the viewer is an approver of the document.
   * If true, they'll see approval-based footer controls.
   */
  protected get isApprover() {
    return this.args.document.approvers?.some(
      (e) => e === this.args.profile.email,
    );
  }

  /**
   * Whether the viewer is a group approver, but not an individual approver.
   * If true, hides the "Remove me" overflow menu next to the "Approve" button.
   */
  protected get isGroupApproverOnly() {
    return this.args.viewerIsGroupApprover && !this.isApprover;
  }

  /**
   * A computed property that returns all approvers and approverGroups.
   * Passed to the EditableField component to render the list of approvers and groups.
   * Recomputes when the approvers or approverGroups arrays change.
   */
  protected get allApprovers() {
    return this.approverGroups.concat(this.approvers);
  }

  get isContributor() {
    return this.args.document.contributors?.some(
      (e) => e === this.args.profile.email,
    );
  }

  /**
   * Whether the document viewer is its owner.
   * True if the logged in user's email matches the documents owner.
   */
  protected get isOwner() {
    return this.args.document.owners?.[0] === this.args.profile.email;
  }

  /**
   * Whether the editing of document metadata allowed, excluding the
   * product/area field, which is disallowed for published docs.
   * If the doc is locked, editing is disabled and a message is shown
   * explaining that suggestions must be removed from the header.
   *
   * If the doc was created off-app, editing is disabled and a message
   * is shown explaining that only app-created docs can be edited.
   *
   * If the doc is in a known state, e.g., draft, in review, or approved,
   * editing is disabled for non-doc-owners.
   *
   * If the doc is in an unknown state, editing is disabled.
   */
  protected get editingIsDisabled() {
    if (this.docIsLocked) {
      return true;
    }

    if (!this.args.document.appCreated) {
      return true;
    }

    return !this.isOwner;
  }

  /**
   * Whether the footer controls are disabled.
   * True if the doc is locked or was created off-app.
   * Determines if we show controls like "approve" and "request changes"
   * or a message explaining their absence.
   */
  protected get footerControlsAreDisabled() {
    if (this.docIsLocked || !this.args.document.appCreated) {
      return true;
    }
  }

  /**
   * Whether the footer is shown.
   * True for owners and approvers who may need to see either the
   * "doc is locked" message or the doc-management controls, except
   * immediately after the user leaves the approver role.
   */
  protected get footerIsShown() {
    return (
      !this.hasJustLeftApproverRole &&
      (this.isApprover || this.isOwner || this.isGroupApproverOnly)
    );
  }

  /**
   * Whether editing is enabled for basic metadata fields.
   * Used in the template to make some logic more readable.
   */
  protected get editingIsEnabled() {
    return !this.editingIsDisabled;
  }

  /**
   * The action run when the user clicks the docType checkbox.
   * Toggles the local `docTypeCheckboxValue` property to
   * enable or disable the "publish" button.
   */
  @action protected onDocTypeCheckboxChange(event: Event) {
    const eventTarget = event.target;
    assert(
      "event.target must be an HTMLInputElement",
      eventTarget instanceof HTMLInputElement,
    );
    this.docTypeCheckboxValue = eventTarget.checked;
  }

  /**
   * The action to show the Projects modal.
   * Triggered by clicking the "+" button in the Projects section.
   */
  @action protected showProjectsModal() {
    this.projectsModalIsShown = true;
  }

  /**
   * The action to hide the Projects modal.
   * Passed to the Projects modal component and
   * triggered on modal close.
   */
  @action protected hideProjectsModal() {
    this.projectsModalIsShown = false;
  }

  /**
   * The action to show the "Transfer ownership" modal.
   * Triggered by clicking the "Transfer ownership" button in the footer.
   */
  @action protected showTransferOwnershipModal() {
    this.transferOwnershipModalIsShown = true;
  }

  /**
   * The action to hide the "Transfer ownership" modal.
   * Passed to the "Transfer ownership" modal component and
   * triggered on modal close.
   */
  @action protected hideTransferOwnershipModal() {
    this.transferOwnershipModalIsShown = false;
    this.newOwners = [];
  }

  @action refreshRoute() {
    // We force refresh due to a bug with `refreshModel: true`
    // See: https://github.com/emberjs/ember.js/issues/19260
    const owner = getOwner(this);
    assert("owner must exist", owner);
    const route = owner.lookup(
      `route:${this.router.currentRouteName}`,
    ) as Route;
    assert("route must exist", route);
    route.refresh();
  }
  /**
   * The action to lock a document when a 423 error is thrown.
   * Called by the `maybeShowFlashError` method as well as
   * right before any errors are thrown.
   */
  @action private maybeLockDoc(error: Error) {
    if (this.fetchSvc.getErrorCode(error) === 423) {
      this.docIsLocked = true;
    }
  }

  private showFlashError(error: Error, title: string) {
    this.flashMessages.critical(error.message, {
      title,
      preventDuplicates: true,
    });
  }

  @action showFlashSuccess(title: string, message: string) {
    this.flashMessages.add({
      message,
      title,
    });
  }

  /**
   * The action to set the new intended owner of the doc.
   * Called as the `onChange` action in the "Transfer ownership" modal's
   * PeopleSelect component. Sets the newOwner property and focuses the
   * TypeToConfirm input.
   */
  @action protected setNewOwner(newOwners: string[]) {
    this.newOwners = newOwners;
    this.focusTypeToConfirmInput();
  }

  /**
   * The action to register the "TypeToConfirm" input of the "Transfer ownership" modal.
   * Runs on insert and captures the typeToConfirmInput for focus targeting.
   */
  @action protected registerTypeToConfirmInput(input: HTMLInputElement) {
    this.typeToConfirmInput = input;
  }

  /**
   * The action to focus the "TypeToConfirm" input of the "Transfer ownership" modal.
   * Called for conveniences when the user selects a new owner from the PeopleSelect.
   */
  @action private focusTypeToConfirmInput() {
    assert("typeToConfirmInput must exist", this.typeToConfirmInput);
    this.typeToConfirmInput.focus();
  }

  /**
   * The action to focus the PeopleSelect input. Runs when the `label` is clicked.
   * This is a workaround until `ember-power-select` `8.0.0` is released, enabling
   * the `labelText` argument in the PowerSelectMultiple component.
   */
  @action protected focusPeopleSelect() {
    const peopleSelect = htmlElement(
      "dialog .multiselect input",
    ) as HTMLInputElement;
    peopleSelect.focus();
  }

  /**
   * The to click the "Transfer doc" button. Runs on Enter when the TypeToConfirm
   * input is valid and focused. Runs the `transferOwnership` task along with
   * the modal's internal tasks for consistency with the real click action.
   */
  @action protected clickTransferButton() {
    const button = htmlElement("dialog .hds-button") as HTMLButtonElement;
    button.click();
  }

  /**
   * The action to show the "Ownership transferred" modal.
   * Passed as the `onClose` action of the "Transfer ownership" modal
   * and triggered when clicking the "Close" button in the modal.
   */
  @action protected hideOwnershipTransferredModal() {
    this.ownershipTransferredModalIsShown = false;
  }

  /**
   * The action passed to the approvers EditableField as `onChange`.
   * Updates the local approver arrays when people are added or removed.
   */
  @action updateApprovers(approvers: string[]) {
    this.approverGroups = approvers.filter((approver) => {
      return this.store.peekRecord("group", approver);
    });

    this.approvers = approvers.filter((approver) => {
      if (!this.approverGroups.includes(approver)) {
        return this.store.peekRecord("person", approver);
      }
    });
  }

  @action updateContributors(contributors: string[]) {
    this.contributors = contributors;
  }

  @action saveTitle(title: string) {
    this.title = title;
    void this.save.perform("title", this.title);
  }

  @action saveSummary(summary: string) {
    this.summary = summary;
    void this.save.perform("summary", this.summary);
  }

  @action closeDeleteModal() {
    this.deleteModalIsShown = false;
  }

  @action closeRequestReviewModal() {
    this.requestReviewModalIsShown = false;
  }

  @action protected closeRequestReviewSuccessModal() {
    this.requestReviewModalIsShown = false;
  }

  /**
   * The action run on the sidebar body's scroll event.
   * If the user has scrolled, adds a border to the header.
   */
  @action onScroll() {
    let onScrollFunction = () => {
      assert("_body must exist", this.body);
      this.userHasScrolled = this.body.scrollTop > 0;
    };

    debounce(this, onScrollFunction, 50);
  }

  /**
   * Registers the body element locally and, if the document is a draft,
   * kicks off the task to fetch the draft's `isShareable` attribute.
   */
  @action protected didInsertBody(element: HTMLElement) {
    this.body = element;

    if (this.isDraft) {
      // kick off whether the draft is shareable.
      void this.getDraftPermissions.perform();

      // get docType for the "request review?" modal
      this.args.docType.then((docType) => {
        this.docType = docType;
      });
    }
  }

  /**
   * This is an unfortunate hack to re-render the approvers list
   * after the user leaves the approver role. Because the EditableField
   * component has its own caching logic, it doesn't inherit changes
   * from external components. This can be changed in the future, but will
   * require a refactor of the EditableField and sidebar components.
   *
   * TODO: Improve this
   */
  @action private toggleApproverVisibility() {
    this.approversAreShown = false;
    schedule("afterRender", () => {
      this.approversAreShown = true;
    });
  }

  /**
   * A task that waits for a short time and then resolves.
   * Used to trigger the "link created" state of the share button.
   */
  protected showCreateLinkSuccessMessage = restartableTask(async () => {
    await timeout(isTesting() ? 0 : 1000);
  });

  /**
   * The task to load the projects associated with this document.
   * Called when the Projects list is inserted and used to display
   * rich information in the list.
   */
  protected loadRelatedProjects = task(async () => {
    this.projectsErrorIsShown = false;

    try {
      const projectPromises = this.args.document.projects?.map((project) => {
        return this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/projects/${project}`,
          )
          .then((response) => response?.json());
      });
      const projects = await Promise.all(projectPromises ?? []);
      this._projects = projects;
    } catch (error) {
      this.projectsErrorIsShown = true;
    }
  });

  /**
   * Sets the draft's `isShareable` property based on a selection
   * in the draft-visibility dropdown. Immediately updates the UI
   * to reflect the intended change while a request is made to the
   * back end. Once the request completes, the UI is updated again
   * to reflect the actual state of the document.
   */
  protected setDraftVisibility = restartableTask(
    async (newVisibility: DraftVisibility) => {
      if (this.draftVisibility === newVisibility) {
        return;
      }

      try {
        if (newVisibility === DraftVisibility.Restricted) {
          this.newDraftVisibilityIcon = DraftVisibilityIcon.Restricted;

          const shareButton = htmlElement(SHARE_BUTTON_SELECTOR);

          shareButton.classList.add("out");

          const fetchPromise = this.fetchSvc.fetch(
            `/api/${this.configSvc.config.api_version}/drafts/${this.docID}/shareable`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                isShareable: false,
              }),
            },
          );

          await Promise.all([fetchPromise, timeout(isTesting() ? 0 : 300)]);

          // With the animation done, we can now remove the button.
          this._docIsShareable = false;
        } else {
          // Immediately update the UI to show the share button
          // in its "creating link" state.
          this.newDraftVisibilityIcon = DraftVisibilityIcon.Shareable;
          this._docIsShareable = true;

          await this.fetchSvc.fetch(
            `/api/${this.configSvc.config.api_version}/drafts/${this.docID}/shareable`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                isShareable: true,
              }),
            },
          );

          // Kick off the timer for the "link created" state.
          void this.showCreateLinkSuccessMessage.perform();
        }
      } catch (error) {
        const e = error as Error;
        this.maybeLockDoc(e);
        this.showFlashError(e, "Unable to update draft visibility");
      } finally {
        // reset the new-visibility-intent icon
        this.newDraftVisibilityIcon = null;
      }
    },
  );

  saveProduct = keepLatestTask(async (product: string) => {
    try {
      this.product = product;
      await this.save.perform("product", this.product);
      // productAbbreviation is computed by the back end
    } catch (error) {
      const e = error as Error;
      this.maybeLockDoc(e);
      this.showFlashError(e, "Unable to save product");
    }
  });

  get saveIsRunning() {
    return (
      this.save.isRunning ||
      this.saveCustomField.isRunning ||
      this.patchDocument.isRunning ||
      this.saveProduct.isRunning
    );
  }

  save = task(async (field: string, val: string | string[]) => {
    if (field && val !== undefined) {
      let serializedValue;

      if (typeof val === "string") {
        serializedValue = cleanString(val);
      } else {
        serializedValue = val;
      }

      try {
        await this.patchDocument.perform({
          [field]: serializedValue,
        });
      } catch (err) {
        const e = err as Error;
        this.maybeLockDoc(e);
        this.showFlashError(e, "Unable to save document");
      }
    }
  });

  saveCustomField = task(
    async (
      fieldName: string,
      field: CustomEditableField,
      val: string | string[],
    ) => {
      if (field && val !== undefined) {
        let serializedValue;

        if (typeof val === "string") {
          serializedValue = cleanString(val);
        } else {
          serializedValue = val;
        }

        field.name = fieldName;
        field.value = serializedValue;

        try {
          await this.patchDocument.perform({
            customFields: [field],
          });
        } catch (err) {
          const e = err as Error;
          this.maybeLockDoc(e);
          this.showFlashError(e, "Unable to save document");
        }
      }
    },
  );

  /**
   * The action to save approvers. Called by the EditableField component `onSave`.
   * Sends a patch request to update the `approvers` and `approverGroups` fields.
   */
  protected saveApprovers = dropTask(async () => {
    await this.patchDocument.perform({
      approvers: this.approvers,
      approverGroups: this.approverGroups,
    });
  });

  patchDocument = enqueueTask(async (fields: any, throwOnError?: boolean) => {
    const endpoint = this.isDraft ? "drafts" : "documents";

    try {
      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/${endpoint}/${this.docID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        },
      );
    } catch (error) {
      /**
       * Errors are normally handled in a flash message, but if the
       * consuming method needs special treatment, such as to trigger
       * a modal error, we throw the error up the chain.
       */
      if (throwOnError) {
        throw error;
      }
      const e = error as Error;
      this.maybeLockDoc(e);
      this.showFlashError(e, "Unable to save document");
    } finally {
      this.refreshRoute();
    }
  });

  requestReview = task(async () => {
    try {
      // Update approvers.
      this.toggleApproverVisibility();
      await this.patchDocument.perform({
        approvers: this.approvers.compact(),
      });

      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/reviews/${this.docID}`,
        {
          method: "POST",
        },
      );

      this.router.transitionTo({
        queryParams: { draft: false },
      });

      this.refreshRoute();

      this.status = "In-Review";
      this.draftWasPublished = true;

      await this.waitForDocNumber.perform();
      this.requestReviewModalIsShown = false;
      this.docPublishedModalIsShown = true;
    } catch (error) {
      this.maybeLockDoc(error as Error);
      this.draftWasPublished = null;
      // trigger the modal error
      throw error;
    }
  });

  /**
   * A task that awaits a newly published doc's docNumber assignment.
   * In the unlikely case where the docNumber doesn't appear after 10 seconds,
   * we remove the URL and share button from the "doc published" modal.
   */
  private waitForDocNumber = task(async () => {
    const numberOfTries = 10;

    for (let i = 0; i < numberOfTries; i++) {
      if (!this.args.document.docNumber.endsWith("?")) {
        return;
      } else {
        await timeout(isTesting() ? 0 : 1000);
      }
    }

    this.docNumberLookupHasFailed = true;
  });

  protected deleteDraft = dropTask(async () => {
    try {
      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/drafts/` + this.docID,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      void this.recentlyViewed.fetchAll.perform();

      this.flashMessages.add({
        message: "Document draft deleted",
        title: "Done!",
      });

      this.router.transitionTo("authenticated.my.documents");
    } catch (error) {
      const e = error as Error;
      this.maybeLockDoc(e);

      // trigger the modal error
      throw e;
    }
  });

  /**
   * The task to transfer ownership of a document.
   * Called when the user selects a new owner from the "Transfer ownership" modal.
   * Updates the document's `owners` array and saves it to the back end.
   */
  protected transferOwnership = dropTask(async () => {
    assert("owner must exist", this.newOwners.length > 0);

    try {
      await this.patchDocument.perform(
        {
          owners: this.newOwners,
        },
        true,
      );

      this.transferOwnershipModalIsShown = false;

      this.modalAlerts.open(ModalType.DocTransferred, {
        newOwner: this.newOwners[0],
      });

      this.newOwners = [];

      if (this.isDraft && !this._docIsShareable) {
        this.router.transitionTo("authenticated.dashboard");
      }
    } catch (error) {
      const e = error as Error;
      this.maybeLockDoc(e);

      // trigger the modal error
      throw e;
    }
  });

  /**
   * The action to leave the approver role.
   * Updates the local approvers array and saves it to the back end.
   * On success, shows a success message. On failure, shows an error message
   * and reverts the local approvers array.
   */
  protected leaveApproverRole = task(async () => {
    const cachedApprovers = this.approvers;

    try {
      this.approvers = this.approvers.filter(
        (e) => e !== this.args.profile.email,
      );

      this.approvers = this.approvers;

      await this.save.perform("approvers", this.approvers);

      this.toggleApproverVisibility();

      // We set this so that the "Leaving..." state
      // is shown until the UI updates.
      this.hasJustLeftApproverRole = true;

      this.flashMessages.add({
        message: "You've left the approver role",
        title: "Done!",
      });
    } catch (error) {
      this.approvers = cachedApprovers;

      const e = error as Error;

      this.maybeLockDoc(e);
      this.showFlashError(e, "Error leaving approver role");
    } finally {
      setTimeout(() => {
        // reset state after a short delay
        this.hasJustLeftApproverRole = false;
      }, 5000);
    }
  });

  /**
   * Fetches the draft's `isShareable` attribute and updates the local property.
   * Called when a document draft is rendered.
   */
  private getDraftPermissions = task(async () => {
    try {
      const response = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/drafts/${this.docID}/shareable`,
        )
        .then((response) => response?.json());
      if (response?.isShareable) {
        this._docIsShareable = true;
      }
    } catch {}
  });

  /**
   * The action to approve a document. Triggered by clicking the "Approve"
   * button in the footer. Saves the document's `approvedBy` array, which
   * adds an approval badge to the approver's avatar. On success, shows
   * the read-only "Approved" mock-button state.
   */
  approve = task(
    async (options?: { skipSuccessMessage: boolean } | MouseEvent) => {
      try {
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/approvals/${this.docID}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );

        this.hasApproved = true;

        /**
         * This will be the case with a group approver.
         */
        if (!this.approvers.includes(this.args.profile.email)) {
          this.approvers.push(this.args.profile.email);
          this.approvers = this.approvers;
          this.toggleApproverVisibility();
        }

        if (options instanceof MouseEvent || !options?.skipSuccessMessage) {
          this.showFlashSuccess("Done!", "Document approved");
        }
      } catch (error) {
        const e = error as Error;
        this.maybeLockDoc(e);
        this.showFlashError(e, "Unable to approve");
      } finally {
        this.refreshRoute();
      }
    },
  );

  /**
   * The action to reject an FRD, a doc-specific type of approval.
   * Triggered by approvers clicking the thumbs-down button.
   * Saves the document's `changesRequestedBy` array, which adds a
   * rejection badge to the approver's avatar. On success, shows
   * the read-only "Rejected" mock-button state.
   */
  rejectFRD = task(async () => {
    try {
      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/approvals/${this.docID}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      this.hasRejectedFRD = true;

      this.showFlashSuccess("Done!", "FRD rejected");
    } catch (error) {
      const e = error as Error;
      this.maybeLockDoc(e);
      this.showFlashError(e, "Couldn't process your request");
    } finally {
      this.refreshRoute();
    }
  });

  changeDocumentStatus = task(async (newStatus: string) => {
    const cachedStatus = this.status;

    // Instantly update the UI
    this.status = newStatus;

    try {
      await this.patchDocument.perform({
        status: newStatus,
      });

      this.showFlashSuccess(
        "Done!",
        `Document status changed to "${newStatus}"`,
      );
    } catch (error) {
      this.status = cachedStatus;

      const e = error as Error;

      this.maybeLockDoc(e);
      this.showFlashError(e, "Unable to change document status");
    } finally {
      this.refreshRoute();
    }
  });

  /**
   * The task to remove a document from a project (and vice versa).
   * Called via the "remove" button in the Projects overflow menu.
   */
  removeDocFromProject = task(async (projectId: string) => {
    const cachedProjects = this._projects;

    try {
      const projectIndex = this._projects?.findIndex(
        (project) => project.id === projectId,
      );

      if (projectIndex === undefined || projectIndex === -1) return;

      // update the local state immediately
      this._projects?.splice(projectIndex, 1);
      this._projects = this._projects;

      // fetch the existing resources
      const projectResources = (await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/projects/${projectId}/related-resources`,
        )
        .then((response) => response?.json())) as HermesProjectResources;

      let hermesDocuments = projectResources.hermesDocuments ?? [];
      let externalLinks = projectResources.externalLinks ?? [];

      // filter out the current document
      hermesDocuments = hermesDocuments.filter(
        (doc) => doc.googleFileID !== this.docID,
      );

      // update the sort order of all resources
      updateRelatedResourcesSortOrder(hermesDocuments, externalLinks);

      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/projects/${projectId}/related-resources`,
        {
          method: "PUT",
          body: JSON.stringify({
            hermesDocuments: hermesDocuments.map((doc) => {
              return {
                googleFileID: doc.googleFileID,
                sortOrder: doc.sortOrder,
              };
            }),
            externalLinks,
          }),
        },
      );
    } catch (error) {
      this._projects = cachedProjects;
      this._projects = this._projects;

      const e = error as Error;
      this.maybeLockDoc(e);
      this.showFlashError(e, "Unable to remove project");
    } finally {
      this.refreshRoute();
    }
  });

  /**
   * The task to add a document to an existing project.
   * Called when the user selects a project from the "add to project" modal.
   * Adds the project to the local array and re-renders the list.
   * Saves the project's related resources to the back end.
   */
  protected addDocToProject = task(async (project: HermesProjectInfo) => {
    const cachedProjects = this._projects;

    try {
      // Update the local state immediately.
      this._projects?.unshift(project);
      this._projects = this._projects;

      // Fetch the existing resources
      const projectResources = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/projects/${project.id}/related-resources`,
        )
        .then((response) => response?.json());

      let hermesDocuments = projectResources.hermesDocuments ?? [];
      let externalLinks = projectResources.externalLinks ?? [];

      // Add the formatted document to the start of the array
      hermesDocuments.unshift({
        googleFileID: this.args.document.objectID,
        sortOrder: 1,
      });

      // Update the sort order of all resources
      updateRelatedResourcesSortOrder(hermesDocuments, externalLinks ?? []);

      // Save the resources to the back end
      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/projects/${project.id}/related-resources`,
        {
          method: "POST",
          body: JSON.stringify({
            hermesDocuments: hermesDocuments.map(
              (
                doc:
                  | RelatedHermesDocument
                  | { googleFileID: string; sortOrder: number },
              ) => {
                return {
                  googleFileID: doc.googleFileID,
                  sortOrder: doc.sortOrder,
                };
              },
            ),
            externalLinks,
          }),
        },
      );
    } catch (error) {
      this._projects = cachedProjects;
      this._projects = this._projects;

      const e = error as Error;

      this.maybeLockDoc(e);
      this.showFlashError(e, "Unable to add document to project");
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar": typeof DocumentSidebarComponent;
  }
}
