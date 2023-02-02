import Component from "@glimmer/component";
import { task, timeout } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import Ember from "ember";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RouterService from "@ember/routing/router-service";
import ModalAlertsService from "hermes/services/modal-alerts";
import { HermesUser } from "hermes/types/document";
import FlashService from "ember-cli-flash/services/flash-messages";

interface DocFormErrors {
  title: string | null;
  summary: string | null;
  productAbbreviation: string | null;
  tags: string | null;
  contributors: string | null;
}

const FORM_ERRORS: DocFormErrors = {
  title: null,
  summary: null,
  productAbbreviation: null,
  tags: null,
  contributors: null,
};

const AWAIT_DOC_DELAY = Ember.testing ? 0 : 2000;
const AWAIT_DOC_CREATED_MODAL_DELAY = Ember.testing ? 0 : 1500;

interface NewDocFormComponentSignature {
  Args: {
    productAbbrevMappings: Map<string, string>;
    docType: string;
  };
}

export default class NewDocFormComponent extends Component<NewDocFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: FlashService;
  @service declare modalAlerts: ModalAlertsService;
  @service declare router: RouterService;

  @tracked protected title: string = "";
  @tracked protected summary: string = "";
  @tracked protected productArea: string = "";
  @tracked protected contributors: HermesUser[] = [];

  /**
   * Whether the form has all required fields filled out.
   * True if the title and product area are filled out.
   */
  @tracked protected formRequirementsMet = false;

  /**
   * Whether the document is being created.
   * Set true when the createDoc task is running.
   * Reverted only if an error occurs.
   */
  @tracked protected docIsBeingCreated = false;

  /**
   * An object containing error messages for each applicable form field.
   */
  @tracked protected formErrors = { ...FORM_ERRORS };

  /**
   * Whether the summary is more than 200 characters.
   * Used in the template to gently discourage long summaries.
   */
  @tracked protected summaryIsLong = false;

  /**
   * Whether to validate eagerly, that is, after every change to the form.
   * Set true after an invalid submission attempt.
   */
  @tracked private validateEagerly = false;

  /**
   * Whether the form has errors.
   */
  private get hasErrors(): boolean {
    const defined = (a: unknown) => a != null;
    return Object.values(this.formErrors).filter(defined).length > 0;
  }

  /**
   * The product abbreviation for the selected product area.
   */
  protected get productAbbreviation() {
    return this.args.productAbbrevMappings.get(this.productArea);
  }
  /**
   * Sets `formRequirementsMet` and conditionally validates the form.
   */
  private maybeValidate() {
    if (this.title && this.productArea) {
      this.formRequirementsMet = true;
    } else {
      this.formRequirementsMet = false;
    }
    if (this.validateEagerly) {
      this.validate();
    }
  }

  /**
   * Validates the form and updates the `formErrors` property.
   */
  private validate() {
    const errors = { ...FORM_ERRORS };
    if (this.productAbbreviation) {
      if (/\d/.test(this.productAbbreviation)) {
        errors.productAbbreviation =
          "Product abbreviation can't include a number";
      }
    }
    this.formErrors = errors;
  }

  /**
   * Returns contributor emails as an array of strings.
   */
  private getEmails(values: HermesUser[]) {
    return values.map((person) => person.email);
  }

  /**
   * Updates the summary property, checks if the `summaryIsLong`, then
   * conditionally validates the form.
   */
  @action protected updateSummary(event: InputEvent) {
    this.summary = (event.target as HTMLTextAreaElement).value;
    if (this.summary.length > 200) {
      this.summaryIsLong = true;
    } else {
      this.summaryIsLong = false;
    }
    this.maybeValidate();
  }

  /**
   * Updates the title property and conditionally validates the form.
   */
  @action protected updateTitle(event: InputEvent) {
    this.title = (event.target as HTMLInputElement).value;
    this.maybeValidate();
  }

  /**
   * Updates the productArea property and conditionally validates the form.
   */
  @action protected updateProductArea(event: Event) {
    this.productArea = (event.target as HTMLSelectElement).value;
    this.maybeValidate();
  }

  /**
   * Updates the contributors property and conditionally validates the form.
   */
  @action protected updateContributors(contributors: HermesUser[]) {
    this.contributors = contributors;
  }

  /**
   * Validates the form, and, if valid, creates a document.
   * If the form is invalid, sets `validateEagerly` true.
   */
  @action protected submit(event: SubmitEvent) {
    event.preventDefault();
    this.validateEagerly = true;
    this.validate();
    if (this.formRequirementsMet && !this.hasErrors) {
      this.createDoc.perform();
    }
  }

  /**
   * Creates a document draft, then redirects to the document.
   * On error, show a flashMessage and allow users to try again.
   */
  private createDoc = task(async () => {
    this.docIsBeingCreated = true;

    try {
      const doc = await this.fetchSvc.fetch("/api/v1/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributors: this.getEmails(this.contributors),
          docType: this.args.docType,
          owner: this.authenticatedUser.info.email,
          product: this.productArea,
          productAbbreviation: this.productAbbreviation,
          summary: this.summary,
          title: this.title,
        }),
      });

      // Wait for document to be available.
      await timeout(AWAIT_DOC_DELAY);

      // Set modal on a delay so it appears after transition.
      this.modalAlerts.setActive.perform(
        "docCreated",
        AWAIT_DOC_CREATED_MODAL_DELAY
      );

      this.router.transitionTo("authenticated.document", doc.id, {
        queryParams: { draft: true },
      });
    } catch (err: unknown) {
      this.docIsBeingCreated = false;
      this.flashMessages.add({
        title: "Error creating document draft",
        message: `${err}`,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    }
  });
}
