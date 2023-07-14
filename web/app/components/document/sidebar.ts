import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { getOwner } from "@ember/application";
import { inject as service } from "@ember/service";
import { restartableTask, task } from "ember-concurrency";
import { dasherize } from "@ember/string";
import cleanString from "hermes/utils/clean-string";
import { debounce } from "@ember/runloop";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { AuthenticatedUser } from "hermes/services/authenticated-user";
import { HermesDocument, HermesUser } from "hermes/types/document";
import { assert } from "@ember/debug";
import Route from "@ember/routing/route";

interface DocumentSidebarComponentSignature {
  Args: {
    profile: AuthenticatedUser;
    document: HermesDocument;
    docType: string;
    deleteDraft: (docId: string) => void;
  };
}

export default class DocumentSidebarComponent extends Component<DocumentSidebarComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare session: SessionService;
  @service declare flashMessages: FlashMessageService;

  @tracked isCollapsed = false;
  @tracked archiveModalIsActive = false;
  @tracked deleteModalIsActive = false;
  @tracked requestReviewModalIsActive = false;
  @tracked docTypeCheckboxValue = false;
  @tracked emailFields = ["approvers", "contributors"];

  get modalIsActive() {
    return (
      this.archiveModalIsActive ||
      this.deleteModalIsActive ||
      this.requestReviewModalIsActive
    );
  }

  get isDraft() {
    return this.args.document?.isDraft;
  }

  get docID() {
    return this.args.document?.objectID;
  }

  // TODO: This state tracking could be improved with a document model
  // (not necessarily, an ember data model, but some sort of tracking-aware
  // class to stuff this in instead of passing a POJO around).
  @tracked title = this.args.document.title || "";
  @tracked summary = this.args.document.summary || "";
  @tracked contributors = this.args.document.contributors || [];
  @tracked approvers = this.args.document.approvers || [];
  @tracked product = this.args.document.product || "";
  @tracked team = this.args.document.team || "";

  @tracked userHasScrolled = false;
  @tracked _body: HTMLElement | null = null;

  get body() {
    assert("_body must exist", this._body);
    return this._body;
  }

  get docIsLocked() {
    return this.args.document?.locked;
  }

  get customEditableFields() {
    let customEditableFields = this.args.document.customEditableFields || {};
    for (const field in customEditableFields) {
      // @ts-ignore - TODO: Type this
      customEditableFields[field]["value"] = this.args.document[field];
    }
    return customEditableFields;
  }

  @action toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
  }

  get approveButtonText() {
    if (!this.hasApproved) {
      return "Approve";
    } else {
      return "Already approved";
    }
  }

  get requestChangesButtonText() {
    // FRDs are a special case that can be approved or not approved.
    if (this.args.document.docType === "FRD") {
      if (!this.hasRequestedChanges) {
        return "Not approved";
      } else {
        return "Already not approved";
      }
    }

    if (!this.hasRequestedChanges) {
      return "Request changes";
    } else {
      return "Already requested changes";
    }
  }

  @action onDocTypeCheckboxChange(event: Event) {
    const eventTarget = event.target;
    assert(
      "event.target must be an HTMLInputElement",
      eventTarget instanceof HTMLInputElement
    );
    this.docTypeCheckboxValue = eventTarget.checked;
  }

  get moveToStatusButtonColor() {
    switch (this.args.document.status) {
      case "In-Review":
        return "primary";
      default:
        return "secondary";
    }
  }

  // moveToStatusButtonTargetStatus returns the target status that the button
  // will move a document to.
  get moveToStatusButtonTargetStatus() {
    switch (this.args.document.status) {
      case "In-Review":
        return "Approved";
      default:
        return "In-Review";
    }
  }

  get moveToStatusButtonText() {
    return `Move to ${this.moveToStatusButtonTargetStatus}`;
  }

  // isApprover returns true if the logged in user is a document approver.
  get isApprover() {
    return this.args.document.approvers?.some(
      (e) => e.email === this.args.profile.email
    );
  }

  get isContributor() {
    return this.args.document.contributors?.some(
      (e) => e.email === this.args.profile.email
    );
  }

  // hasApproved returns true if the logged in user has approved the document.
  get hasApproved() {
    return this.args.document.approvedBy?.includes(this.args.profile.email);
  }

  // hasRequestedChanges returns true if the logged in user has requested
  // changes of the document.
  get hasRequestedChanges() {
    return this.args.document.changesRequestedBy?.includes(
      this.args.profile.email
    );
  }

  get docIsApproved() {
    return this.args.document.status.toLowerCase() === "approved";
  }

  get docIsInReview() {
    return dasherize(this.args.document.status) === "in-review";
  }

  // isOwner returns true if the logged in user is the document owner.
  get isOwner() {
    return this.args.document.owners?.[0] === this.args.profile.email;
  }

  get userHasEditPrivileges() {
    return this.isOwner || this.isContributor || this.isApprover;
  }

  get editingIsDisabled() {
    if (!this.args.document.appCreated || this.docIsLocked) {
      // true is the doc wasn't appCreated or is in a locked state
      return true;
    } else if (this.isDraft || this.docIsInReview || this.docIsApproved) {
      // true is the doc is a draft/in review/approved and the user is not an owner, contributor, or approver
      return !this.userHasEditPrivileges;
    } else {
      // doc is obsolete or some unknown status..
      return true;
    }
  }

  @action refreshRoute() {
    // We force refresh due to a bug with `refreshModel: true`
    // See: https://github.com/emberjs/ember.js/issues/19260
    const owner = getOwner(this);
    assert("owner must exist", owner);
    const route = owner.lookup(
      `route:${this.router.currentRouteName}`
    ) as Route;
    assert("route must exist", route);
    route.refresh();
  }

  @action maybeShowFlashError(error: Error, title: string) {
    if (!this.modalIsActive) {
      this.showFlashError(error, title);
    }
  }

  showFlashError(error: Error, title: string) {
    this.flashMessages.add({
      title,
      message: error.message,
      type: "critical",
      timeout: 6000,
      extendedTimeout: 1000,
      preventDuplicates: true,
    });
  }

  @action showFlashSuccess(title: string, message: string) {
    this.flashMessages.add({
      message,
      title,
      type: "success",
      timeout: 6000,
      extendedTimeout: 1000,
    });
  }

  updateProduct = restartableTask(async (product: string) => {
    this.product = product;
    await this.save.perform("product", this.product);
    // productAbbreviation is computed by the back end
  });

  updateTeam = restartableTask(async (team: string) => {
    this.team = team;
    await this.save.perform("team", this.team);
    // productAbbreviation is computed by the back end
  });

  save = task(async (field: string, val: string | HermesUser[]) => {
    if (field && val) {
      let serializedValue;

      if (typeof val === "string") {
        serializedValue = cleanString(val);
      } else {
        serializedValue = val.map((p: HermesUser) => p.email);
      }

      try {
        await this.patchDocument.perform({
          [field]: serializedValue,
        });
      } catch (err) {
        // revert field value on failure
        (this as any)[field] = val;

        this.showFlashError(err as Error, "Unable to save document");
      }
    }
  });

  patchDocument = task(async (fields) => {
    const endpoint = this.isDraft ? "drafts" : "documents";

    try {
      await this.fetchSvc.fetch(`/api/v1/${endpoint}/${this.docID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Unable to save document");
      throw error;
    }
    this.refreshRoute();
  });

  requestReview = task(async () => {
    try {
      // Update approvers.
      await this.patchDocument.perform({
        approvers: this.approvers.compact().mapBy("email"),
      });

      await this.fetchSvc.fetch(`/api/v1/reviews/${this.docID}`, {
        method: "POST",
      });

      this.showFlashSuccess("Done!", "Document review requested");

      this.router.transitionTo({
        queryParams: { draft: false },
      });
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Unable to request review");
      throw error;
    }
    this.requestReviewModalIsActive = false;
    this.refreshRoute();
  });

  deleteDraft = task(async () => {
    try {
      await this.args.deleteDraft(this.docID);
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Unable to delete draft");
      throw error;
    }
  });

  @action
  updateApprovers(approvers: HermesUser[]) {
    this.approvers = approvers;
  }

  @action
  updateContributors(contributors: HermesUser[]) {
    this.contributors = contributors;
  }

  @action
  updateCustomFieldValue(field: string, value: string) {
    assert("customEditableFields must exist", this.customEditableFields);

    const customEditableField = this.customEditableFields[field];
    assert("customEditableField must exist", customEditableField);

    let customEditableFieldValue = customEditableField.value;
    assert("customEditableFieldValue must exist", customEditableFieldValue);

    customEditableFieldValue = value;
  }

  @action closeDeleteModal() {
    this.deleteModalIsActive = false;
  }

  @action closeRequestReviewModal() {
    this.requestReviewModalIsActive = false;
  }

  @action closeArchiveModal() {
    this.archiveModalIsActive = false;
  }

  @action onScroll() {
    let onScrollFunction = () => {
      this.userHasScrolled = this.body.scrollTop > 0;
    };

    debounce(this, onScrollFunction, 50);
  }

  @action registerBody(element: HTMLElement) {
    this._body = element;
  }

  approve = task(async () => {
    try {
      await this.fetchSvc.fetch(`/api/v1/approvals/${this.docID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      this.showFlashSuccess("Done!", "Document approved");
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Unable to approve");
      throw error;
    }

    this.refreshRoute();
  });

  requestChanges = task(async () => {
    try {
      await this.fetchSvc.fetch(`/api/v1/approvals/${this.docID}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      // Add a notification for the user
      let msg = "Requested changes for document";
      // FRDs are a special case that can be approved or not approved.
      if (this.args.document.docType === "FRD") {
        msg = "Document marked as not approved";
      }
      this.showFlashSuccess("Done!", msg);
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Change request failed");
      throw error;
    }
    this.refreshRoute();
  });

  changeDocumentStatus = task(async (status) => {
    try {
      await this.patchDocument.perform({
        status: status,
      });
      this.showFlashSuccess("Done!", `Document status changed to "${status}"`);
    } catch (error: unknown) {
      this.maybeShowFlashError(
        error as Error,
        "Unable to change document status"
      );
      throw error;
    }
    this.refreshRoute();
  });
}
