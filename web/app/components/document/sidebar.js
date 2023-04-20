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

  @action maybeShowFlashError(error, title) {
    if (!this.modalIsActive) {
      this.flashMessages.add({
        title,
        message: error.message,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    }
  }

  @action showFlashSuccess(title, message) {
    this.flashMessages.add({
      message,
      title,
      type: "success",
      timeout: 6000,
      extendedTimeout: 1000,
    });
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
    } catch {
      this.maybeShowFlashError(error, "Unable to save document");
      throw error;
    }
    this.refreshRoute();
  }

  @task
  *requestReview() {
    try {
      // Update approvers.
      yield this.patchDocument.perform({
        approvers: this.approvers.compact().mapBy("email"),
      });

      yield this.fetchSvc.fetch(`/api/v1/reviews/${this.docID}`, {
        method: "POST",
      });

      this.showFlashSuccess("Done!", "Document review requested");

      this.router.transitionTo({
        queryParams: { draft: false },
      });
    } catch (error) {
      this.maybeShowFlashError(error, "Unable to request review");
      throw error;
    }
    this.requestReviewModalIsActive = false;
    this.refreshRoute();
  }

  @task
  *deleteDraft() {
    try {
      yield this.args.deleteDraft.perform(this.docID);
    } catch (error) {
      this.maybeShowFlashError(error, "Unable to delete draft");
      throw error;
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
  }

  @action closeRequestReviewModal() {
    this.requestReviewModalIsActive = false;
  }

  @action closeArchiveModal() {
    this.archiveModalIsActive = false;
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
  *approve() {
    try {
      yield this.fetchSvc.fetch(`/api/v1/approvals/${this.docID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      this.showFlashSuccess("Done!", "Document approved");
    } catch (error) {
      this.maybeShowFlashError(error, "Unable to approve");
      throw error;
    }

    this.refreshRoute();
  }

  @task
  *requestChanges() {
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
      this.showFlashSuccess("Done!", msg);
    } catch (error) {
      this.maybeShowFlashError(error, "Change request failed");
      throw error;
    }
    this.refreshRoute();
  }

  @task
  *changeDocumentStatus(status) {
    try {
      yield this.patchDocument.perform({
        status: status,
      });
      this.showFlashSuccess("Done!", `Document status changed to "${status}"`);
    } catch (error) {
      this.maybeShowFlashError(error, "Unable to change document status");
      throw error;
    }
    this.refreshRoute();
  }
}
