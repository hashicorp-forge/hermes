import Component from "@glimmer/component";
import { task } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RouterService from "@ember/routing/router-service";
import ModalAlertsService from "hermes/services/modal-alerts";
import { HermesUser } from "hermes/types/document";
import FlashService from "ember-cli-flash/services/flash-messages";
import { assert } from "@ember/debug";
import cleanString from "hermes/utils/clean-string";

interface ProjectFormErrors {
  name: string | null;
}

const FORM_ERRORS: ProjectFormErrors = {
  name: null,
};

interface NewProjectFormComponentSignature {
  Args: {};
}

export default class NewProjectFormComponent extends Component<NewProjectFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: FlashService;
  @service declare modalAlerts: ModalAlertsService;
  @service declare router: RouterService;

  @tracked protected name: string = "";
  @tracked protected summary: string = "";

  @tracked protected jira = "";

  @tracked protected _form: HTMLFormElement | null = null;

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
  @tracked protected projectIsBeingCreated = false;

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

  /**
   * Sets `formRequirementsMet` and conditionally validates the form.
   */
  private maybeValidate() {
    if (this.name) {
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
   * If the summary is long, shows a gentle warning.
   * Conditionally validates.
   */
  @action protected updateForm() {
    const formObject = Object.fromEntries(new FormData(this.form).entries());

    assert("title is missing from formObject", "title" in formObject);
    assert("summary is missing from formObject", "summary" in formObject);

    this.name = formObject["title"] as string;
    this.summary = formObject["summary"] as string;

    if (this.summary.length > 200) {
      this.summaryIsLong = true;
    } else {
      this.summaryIsLong = false;
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
      this.createProject.perform();
    }
  }

  /**
   * Creates a document draft, then redirects to the document.
   * On error, show a flashMessage and allow users to try again.
   */
  private createProject = task(async () => {
    this.projectIsBeingCreated = true;

    try {
      // TODO: make this work
      const project = await this.fetchSvc
        .fetch("/api/v1/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: cleanString(this.summary),
            name: cleanString(this.name),
            // TODO: jira
          }),
        })
        .then((response) => response?.json());

      this.router.transitionTo("authenticated.project", project.id);
      this.flashMessages.add({
        title: "Project created",
        message: "Your project has been created.",
        type: "success",
        timeout: 3000,
        extendedTimeout: 1000,
      });
    } catch (err: unknown) {
      this.projectIsBeingCreated = false;
      this.flashMessages.add({
        title: "Error creating project",
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
    "New::ProjectForm": typeof NewProjectFormComponent;
  }
}
