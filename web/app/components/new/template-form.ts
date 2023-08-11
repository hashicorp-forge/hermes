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
import { assert } from "@ember/debug";
import cleanString from "hermes/utils/clean-string";
// custom-template-add
interface DocFormErrors {
  templateName: string | null;
  docId: string|null;
  description: string | null;
}

const FORM_ERRORS: DocFormErrors = {
  templateName: null,
  docId: null,
  description: null,
};

const AWAIT_DOC_DELAY = Ember.testing ? 0 : 2000;
const AWAIT_DOC_CREATED_MODAL_DELAY = Ember.testing ? 0 : 1500;

interface NewTemplateFormComponentSignature {
}

export default class NewDocFormComponent extends Component<NewTemplateFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: FlashService;
  @service declare modalAlerts: ModalAlertsService;
  @service declare router: RouterService;

  @tracked protected templateName: string = "";
  @tracked protected docId: string = "";
  @tracked protected description: string = "";

  @tracked protected _form: HTMLFormElement | null = null;

  /**
   * Whether the form has all required fields filled out.
   * True if the templateName and product area are filled out.
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
   * Whether the description is more than 200 characters.
   * Used in the template to gently discourage long summaries.
   */

  @tracked protected descriptionIsLong = false;


  /**
   * Whether to validate eagerly, that is, after every change to the form.
   * Set true after an invalid submission attempt.
   */
  @tracked private validateEagerly = false;

  /**
   * The form element. Used to bind FormData to our tracked elements.
   */
  get form(): HTMLFormElement {
    assert("_form must exist", this._form);
    return this._form;
  }

  /**
   * Whether the form has errors.
   */
  private get hasErrors(): boolean {
    const defined = (a: unknown) => a != null;
    return Object.values(this.formErrors).filter(defined).length > 0;
  }

  private extractDocId(link: string): string {
    // Check if the input is already a valid document ID
    if (/^[a-zA-Z0-9-_]+$/.test(link)) {
      return link;
    }

    try {
      const url = new URL(link);
      const pathname = url.pathname;
      const parts = pathname.split("/");
      const docId = parts[3];
      return docId || link;
    } catch {
      return link; // Invalid or unsupported link format
    }
  }

  /**
   * Sets `formRequirementsMet` and conditionally validates the form.
   */

  private maybeValidate() {
    this.docId=this.extractDocId(this.docId)
    if (this.templateName && this.docId.length==44) {
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
    this.formErrors = errors;
  }

  /**
   * Returns contributor emails as an array of strings.
   */
  private getEmails(values: HermesUser[]) {
    return values.map((person) => person.email);
  }

  @action protected registerForm(form: HTMLFormElement) {
    this._form = form;
  }

  /**
   * Binds the FormData to our locally tracked properties.
   * If the description is long, shows a gentle warning.
   * Conditionally validates.
   */
  
  @action protected updateForm() {
    const formObject = Object.fromEntries(new FormData(this.form).entries());

    assert("templateName is missing from formObject", "templateName" in formObject);
    assert("docId is missing from formObject", "docId" in formObject);
    this.templateName = formObject["templateName"] as string;
    this.docId = formObject["docId"] as string;
    this.description = formObject["description"] as string;

    if (this.description.length > 200) {
      this.descriptionIsLong = true;
    } else {
      this.descriptionIsLong = false;
    }

    this.maybeValidate();
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
    this.docId=this.extractDocId(this.docId)
    try {
      const doc = await this.fetchSvc
        .fetch("/api/v1/custom-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: cleanString(this.templateName),
            docId: cleanString(this.docId),
            description: cleanString(this.description),
          }),
        })
        .then((response) => response?.json());

      // Wait for document to be available.
      await timeout(AWAIT_DOC_DELAY);

      // Set modal on a delay so it appears after transition.
      // this.modalAlerts.setActive.perform(
      //   "docCreated",
      //   AWAIT_DOC_CREATED_MODAL_DELAY
      // );

      this.router.transitionTo("authenticated.new");
    } catch (err: unknown) {
      this.docIsBeingCreated = false;
      this.flashMessages.add({
        templateName: "Error creating template",
        message: `${err}`,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::TemplateForm": typeof NewDocFormComponent;
  }
}
