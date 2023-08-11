import Component from "@glimmer/component";
import { task, timeout } from "ember-concurrency";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import {action, computed} from "@ember/object";
import Ember from "ember";
import FetchService from "hermes/services/fetch";
import RouterService from "@ember/routing/router-service";
import ModalAlertsService from "hermes/services/modal-alerts";
import { HermesUser } from "hermes/types/document";
import FlashService from "ember-cli-flash/services/flash-messages";
import { assert } from "@ember/debug";
import cleanString from "hermes/utils/clean-string";
import { ProductArea } from "../inputs/product-select";
import AuthenticatedUserService, {
  AuthenticatedUser,
} from "hermes/services/authenticated-user";

interface DocFormErrors {
  title: string | null;
  summary: string | null;
  tags: string | null;
  contributors: string | null;
}

const FORM_ERRORS: DocFormErrors = {
  title: null,
  summary: null,
  tags: null,
  contributors: null,
};

const AWAIT_DOC_DELAY = Ember.testing ? 0 : 2000;
const AWAIT_DOC_CREATED_MODAL_DELAY = Ember.testing ? 0 : 1500;

interface NewDocFormComponentSignature {
  Args: {
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
  @tracked protected productArea: string | null = null;
  @tracked protected teamArea: string | null = null;
  @tracked protected projectArea: string| null = null;
  @tracked protected contributors: HermesUser[] = [];

  @tracked selectedBU: string | null = null;

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

  /** For fetching the authenticated user details */
  protected get profile(): AuthenticatedUser {
    return this.authenticatedUser.info;
  }

  /** These are all fields realted to modal dialogues */
  // for all model dialogues on the daashboard
  @tracked showModal1 = false;
  @tracked showModal2 = false;
  @tracked showModal4 = false;

  @tracked businessUnitName: string = '';
  @tracked BUIsBeingCreated = false;

  @tracked TeamName: string = "";
  @tracked TeamIsBeingCreated = false;
  @tracked TeamBU: string | null = null;

  @tracked ProjectBU: string = '';
  @tracked ProjectTeamName: string = "";
  @tracked ProjectIsBeingCreated = false;
  @tracked ProjectName: string | null = null;

  @tracked selectedBU_modal: string | null = null;


  @action
  toggleModal1() {
    this.showModal1 = !this.showModal1;
  }

  @action
  toggleModal2() {
    this.showModal2 = !this.showModal2;
  }

  @action
  toggleModal4() {
    this.showModal4 = !this.showModal4;
  }

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
    if (this.title && this.productArea && this.teamArea && this.projectArea)  {
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
   * If the summary is long, shows a gentle warning.
   * Conditionally validates.
   */
  @action protected updateForm() {
    const formObject = Object.fromEntries(new FormData(this.form).entries());

    assert("title is missing from formObject", "title" in formObject);
    assert("summary is missing from formObject", "summary" in formObject);

    this.title = formObject["title"] as string;
    this.summary = formObject["summary"] as string;

    if ("productArea" in formObject) {
      this.productArea = formObject["productArea"] as string;
    }

    if (this.summary.length > 200) {
      this.summaryIsLong = true;
    } else {
      this.summaryIsLong = false;
    }

    this.maybeValidate();
  }

  /**
   * Updates the contributors property and conditionally validates the form.
   */
  @action protected updateContributors(contributors: HermesUser[]) {
    this.contributors = contributors;
  }

  @action protected onProductSelect(
    productName: string,
    attributes: ProductArea
  ) {
    this.productArea = productName;
    this.selectedBU = productName;
    this.maybeValidate();
  }

  @action protected onTeamSelect(
      teamName: string,
  ) {
    this.teamArea = teamName;
    this.maybeValidate();
  }

  @action protected onProjectSelect(
    projectName: string,
  ) {
    this.projectArea = projectName;
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
  
  @action
  updateSelectedBU(selectedBU: string) {
    this.selectedBU = selectedBU;
    // Trigger the necessary actions, such as fetching filtered teams
    // ...
  }

  /**
   * Creates a document draft, then redirects to the document.
   * On error, show a flashMessage and allow users to try again.
   */
  private createDoc = task(async () => {
    this.docIsBeingCreated = true;

    try {
      const doc = await this.fetchSvc
        .fetch("/api/v1/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributors: this.getEmails(this.contributors),
            docType: this.args.docType,
            product: this.productArea,
            team: this.teamArea,
            project: this.projectArea,
            summary: cleanString(this.summary),
            title: cleanString(this.title),
          }),
        })
        .then((response) => response?.json());

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

  /** Modal dialogue methods */


    @action
    updateSelectedBU_modal(selectedBU: string) {
      this.selectedBU_modal = selectedBU;
      // Trigger the necessary actions, such as fetching filtered teams
      // ...
    }


    @action onProductSelect_modal(
      productName: string,
    ) {
      this.TeamBU = productName;
      this.ProjectBU = productName;
      // This is for filtering the teams based on BU
      this.selectedBU_modal = productName;
    }

    @action protected onTeamSelect_modal(
      teamName: string,
    ) {
      this.ProjectTeamName = teamName;
    }

    /**
     * Creates a Team, then redirects to the dashboard.
     * On error, show a flashMessage and allow users to try again.
     */
    private createTeam = task(async () => {
      this.TeamIsBeingCreated = true;
      try {
        const bu = await this.fetchSvc
            .fetch("/api/v1/teams", {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({
                teamName: this.TeamName,
                teamBU: this.TeamBU,
              }),
            })
            .then((response) => response?.json());

        // Wait for document to be available.
        await timeout(AWAIT_DOC_DELAY);

        this.router.transitionTo("authenticated.dashboard");
        this.toggleModal2();
        this.flashMessages.add({
          title: "Success",
          message: `New Team has been created Succesfully`,
          type: "success",
          timeout: 6000,
          extendedTimeout: 1000,
        });
      } catch (err) {
        this.toggleModal2();
        this.TeamIsBeingCreated = false;
        this.flashMessages.add({
          title: "Error creating new Team",
          message: `${err}`,
          type: "critical",
          timeout: 6000,
          extendedTimeout: 1000,
        });
      } finally {
        // Hide spinning wheel or loading state
        this.TeamIsBeingCreated=false;
      }
    });

    @action submitFormteam(event: SubmitEvent) {
      // Show spinning wheel or loading state
      this.TeamIsBeingCreated=true;
      event.preventDefault();

      const formElement = event.target as HTMLFormElement; // Explicit typecasting
      const formData = new FormData(formElement);
      const formObject = Object.fromEntries(formData.entries());

      // Do something with the form values
      this.TeamName = formObject['team-name'] as string;

      // now post this info
      this.createTeam.perform();

      // Clear the form fields
      this.TeamName = "";
      this.TeamBU = "";
    }

    /**
     * Creates a BU, then redirects to the dashboard.
     * On error, show a flashMessage and allow users to try again.
     */
    private createBU= task(async () => {
      this.BUIsBeingCreated = true;
      try {
        const bu = await this.fetchSvc
            .fetch("/api/v1/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productName: this.businessUnitName,
              }),
            })
            .then((response) => response?.json());

        // Wait for document to be available.
        await timeout(AWAIT_DOC_DELAY);

        this.router.transitionTo("authenticated.dashboard");
        this.toggleModal1();
        this.flashMessages.add({
          title: "Success",
          message: `New Business Unit (BU) created succesfully`,
          type: "success",
          timeout: 6000,
          extendedTimeout: 1000,
        });
      } catch (err) {
        this.BUIsBeingCreated = false;
        this.toggleModal1();
        this.flashMessages.add({
          title: "Error creating new Business Unit",
          message: `${err}`,
          type: "critical",
          timeout: 6000,
          extendedTimeout: 1000,
        }); }
      finally {
        // Hide spinning wheel or loading state
        this.BUIsBeingCreated=false;
      }
    });

    @action submitFormBU(event: SubmitEvent) {
      // Show spinning wheel or loading state
      this.BUIsBeingCreated = true;
      event.preventDefault();
    
      const formElement = event.target as HTMLFormElement; // Explicit typecasting
      const formData = new FormData(formElement);
      const formObject = Object.fromEntries(formData.entries());
    
      // Do something with the form values
      this.businessUnitName = formObject['bu-name'] as string;
    
      // now post this info
      this.createBU.perform();
    
      // Clear the form fields
      this.businessUnitName = "";
    }

     /**
   * Creates a Project, then redirects to the dashboard.
   * On error, show a flashMessage and allow users to try again.
   */
   private createProject= task(async () => {
    this.ProjectIsBeingCreated= true;
    try {
      const prj = await this.fetchSvc
          .fetch("/api/v1/projects", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              name: this.ProjectName,
              team: this.ProjectTeamName,
            }),
          })
          .then((response) => response?.json());

      // Wait for document to be available.
      await timeout(AWAIT_DOC_DELAY);

      this.router.transitionTo("authenticated.dashboard");
      this.toggleModal4();
      this.flashMessages.add({
        title: "Success",
        message: `New Project has been created Succesfully`,
        type: "success",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    } catch (err) {
      this.toggleModal4();
      this.ProjectIsBeingCreated = false;
      this.flashMessages.add({
        title: "Error creating new Project",
        message: `${err}`,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      });
      } finally {
        // Hide spinning wheel or loading state
        this.ProjectIsBeingCreated = false;
      }
    });

    /* method to subbit the create a new Project form*/
    @action  submitFormProject(event: SubmitEvent) {
      // Show spinning wheel or loading state
      this.ProjectIsBeingCreated = true;
      event.preventDefault();

      const formElement = event.target as HTMLFormElement; // Explicit typecasting;
      const formData = new FormData(formElement);
      const formObject = Object.fromEntries(formData.entries());

      // Do something with the form values
      this.ProjectName = formObject['project-name'] as string;

      // now post this info
      this.createProject.perform();

      // Clear the form fields
      this.ProjectName  = "";
      this.ProjectBU = "";
      this.ProjectTeamName = "";
    }
    
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::DocForm": typeof NewDocFormComponent;
  }
}
