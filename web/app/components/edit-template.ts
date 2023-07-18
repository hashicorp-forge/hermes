import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { task} from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { HermesTemplate } from "hermes/types/document";
import { assert } from "@ember/debug";
import Ember from "ember";

interface DocFormErrors {
  templateName: string | null;
  longName: string | null;
  docId: string | null;
  description: string | null;
}

const FORM_ERRORS: DocFormErrors = {
  templateName: null,
  longName: null,
  docId: null,
  description: null,
};

interface DeleteTemplateComponentSignature {
  Args: {
    template: HermesTemplate;
  };
}

export default class DeleteTemplateComponent extends Component<DeleteTemplateComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare session: SessionService;
  @service declare flashMessages: FlashMessageService;

  @tracked formModalActive = false;

  @tracked objectID = this.args.template.objectId
  @tracked templateName = this.args.template.templateName;
  @tracked longName = this.args.template.longName;
  @tracked description = this.args.template.description;
  @tracked docId = this.args.template.docId;


  @tracked protected _form: HTMLFormElement | null = null;

  /**
   * Whether the form has all required fields filled out.
   * True if the templateName ,longName and docId are filled out.
   */
  @tracked protected formRequirementsMet = false;

  /**
   * Whether the Template is being updated.
   * Set true when the updateTemplate task is running.
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
    this.docId = this.extractDocId(this.docId)
    if (this.templateName && this.longName && this.docId.length == 44) {
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
    this.longName = formObject["longName"] as string;
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
   * Validates the form, and, if valid, edit the template.
   * If the form is invalid, sets `validateEagerly` true.
   */
  @action protected submit(event: SubmitEvent) {
    event.preventDefault();
    this.validateEagerly = true;
    this.validate();
    if (this.formRequirementsMet && !this.hasErrors) {
      this.updateTemplate.perform();
    }
    this.formModalActive=false
  }

  /**
   *
   * On error, show a flashMessage and allow users to try again.
   */

  @action showFlashSuccess(title: string, message: string) {
    this.flashMessages.add({
      message,
      title,
      type: "success",
      timeout: 6000,
      extendedTimeout: 1000,
    });
  }

  private updateTemplate=task(async() => {
    // Handle the button click logic here
    let patchObj = {
      templateName: this.templateName,
      longName: this.longName,
      description: this.description,
      docId: this.docId
    }

    // Perform additional actions or function calls
    try {
      this.patchTemplate.perform(patchObj);
      this.showFlashSuccess("Done!", `Template metadata updated`);
    } catch (error: unknown) {
      this.maybeShowFlashError(
        error as Error,
        "Unable to update Template metadata"
      );
      throw error;
    }
    // this.router.transitionTo("authenticated.new");
    window.location.reload();
  });

  patchTemplate = task(async (fields) => { 
    try {
      await this.fetchSvc.fetch("/api/v1/custom-template/"+ this.objectID, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
    } catch (error: unknown) {
      this.maybeShowFlashError(error as Error, "Unable to update template");
      throw error;
    }
  });

  @action maybeShowFlashError(error: Error, title: string) {
      this.showFlashError(error, title);
    
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

}
