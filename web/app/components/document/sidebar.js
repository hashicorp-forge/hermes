import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { getOwner } from "@ember/application";
import { inject as service } from "@ember/service";
import { task } from "ember-concurrency";
import { dasherize } from "@ember/string";
import cleanString from "hermes/utils/clean-string";
import { debounce } from "@ember/runloop";

export default class DocumentSidebar extends Component {
  @service("fetch") fetchSvc;
  @service router;
  @service session;
  @service flashMessages;

  @tracked isCollapsed = false;
  @tracked archiveModalIsActive = false;
  @tracked deleteModalIsActive = false;
  @tracked requestReviewModalIsActive = false;
  @tracked docTypeCheckboxValue = false;
  @tracked emailFields = ["approvers", "contributors"];

  @tracked modalErrorIsShown = false;
  @tracked errorTitle = null;
  @tracked errorDescription = null;

  get modalContainer() {
    return document.querySelector(".ember-application");
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
  @tracked tags = this.args.document.tags || [];

  @tracked contributors = this.args.document.contributors || [];
  @tracked approvers = this.args.document.approvers || [];

  @tracked userHasScrolled = false;
  @tracked body = null;

  get customEditableFields() {
    let customEditableFields = this.args.document.customEditableFields || {};
    for (const field in customEditableFields) {
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

  @action
  onDocTypeCheckboxChange(event) {
    this.docTypeCheckboxValue = event.target.checked;
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
    if (this.changeDocumentStatus.isRunning) {
      return "Working...";
    }

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
    if (!this.args.document.appCreated) {
      // true is the doc wasn't appCreated or if the doc is Approved
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
    getOwner(this).lookup(`route:${this.router.currentRouteName}`).refresh();
  }

  @task
  *save(field, val) {
    if (field && val) {
      const oldVal = this[field];
      this[field] = cleanString(val);

      try {
        const serializedValue = this.emailFields.includes(field)
          ? val.map((p) => p.email)
          : val;

        yield this.patchDocument.perform({
          [field]: cleanString(serializedValue),
        });
      } catch (err) {
        // revert field value on failure
        this[field] = oldVal;
      }
    }
  }

  @task
  *patchDocument(fields) {
    const endpoint = this.isDraft ? "drafts" : "documents";

    try {
      yield this.fetchSvc.fetch(`/api/v1/${endpoint}/${this.docID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
    } catch (err) {
      this.showModalError("Error updating document", err);
      throw err;
    }

    this.refreshRoute();
  }

  @task
  *requestReview() {
    // Update approvers.
    try {
      yield this.patchDocument.perform({
        approvers: this.approvers.compact().mapBy("email"),
      });
    } catch (err) {
      this.showModalError("Error updating approvers", err);
      throw err;
    }

    // Create review.
    try {
      yield this.fetchSvc.fetch(`/api/v1/reviews/${this.docID}`, {
        method: "POST",
      });
      // Add a notification for the user
      this.flashMessages.add({
        message: "Document review requested",
        title: "Done!",
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });

      this.router.transitionTo({
        queryParams: { draft: false },
      });

      this.requestReviewModalIsActive = false;
    } catch (err) {
      this.showModalError("Error creating review", err);
    }
    this.refreshRoute();
  }

  @task
  *deleteDraft() {
    try {
      yield this.args.deleteDraft.perform(this.docID);
    } catch (err) {
      this.showModalError("Error deleting draft", err);
    }
  }

  @action
  updateApprovers(approvers) {
    this.approvers = approvers;
  }

  @action
  updateContributors(contributors) {
    this.contributors = contributors;
  }

  @action
  updateCustomFieldValue(field, value) {
    this.customEditableFields[field].value = value;
  }

  @action
  updateTags(tags) {
    this.tags = tags;
  }

  @action closeDeleteModal() {
    this.deleteModalIsActive = false;
    this.resetModalErrors();
  }

  @action closeRequestReviewModal() {
    this.requestReviewModalIsActive = false;
    this.resetModalErrors();
  }

  @action closeArchiveModal() {
    this.archiveModalIsActive = false;
    this.resetModalErrors();
  }

  @action resetModalErrors() {
    this.modalErrorIsShown = false;
    this.errorTitle = null;
    this.errorDescription = null;
  }

  @action onScroll() {
    let onScrollFunction = () => {
      this.userHasScrolled = this.body?.scrollTop > 0;
    };

    debounce(this, onScrollFunction, 50);
  }

  @action registerBody(element) {
    this.body = element;
  }

  @task
  *approve(approver) {
    try {
      yield this.fetchSvc.fetch(`/api/v1/approvals/${this.docID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Add a notification for the user
      this.flashMessages.add({
        message: "Document approved",
        title: "Done!",
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    } catch (err) {
      this.showModalError("Error approving document", err);
    }

    this.refreshRoute();
  }

  @task
  *requestChanges(approver) {
    try {
      yield this.fetchSvc.fetch(`/api/v1/approvals/${this.docID}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      // Add a notification for the user
      let msg = "Requested changes for document";
      // FRDs are a special case that can be approved or not approved.
      if (this.args.document.docType === "FRD") {
        msg = "Document marked as not approved";
      }
      this.flashMessages.add({
        message: msg,
        title: "Done!",
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    } catch (err) {
      this.showModalError("Error requesting changes of document", err);
    }

    this.refreshRoute();
  }

  @task
  *changeDocumentStatus(status) {
    try {
      yield this.patchDocument.perform({
        status: status,
      });

      // Add a notification for the user
      this.flashMessages.add({
        message: `Document status changed to "${status}"`,
        title: "Done!",
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });

      this.archiveModalIsActive = false;
    } catch (err) {
      this.showModalError(`Error marking document status as ${status}`, err);
      throw err;
    }

    this.refreshRoute();
  }

  showModalError(errMsg, error) {
    this.modalErrorIsShown = true;
    this.errorTitle = errMsg;
    this.errorDescription = error;
  }
}
