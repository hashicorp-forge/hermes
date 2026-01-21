import Component from "@glimmer/component";
import { task, timeout } from "ember-concurrency";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import ConfigService from "hermes/services/config";
import { isTesting } from "@embroider/macros";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import RouterService from "@ember/routing/router-service";
import ModalAlertsService, { ModalType } from "hermes/services/modal-alerts";
import { assert } from "@ember/debug";
import cleanString from "hermes/utils/clean-string";
import { ProductArea } from "hermes/services/product-areas";
import { next } from "@ember/runloop";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import DocumentTypesService from "hermes/services/document-types";

interface DocFormErrors {
  title: string | null;
  productAbbreviation: string | null;
}

const AWAIT_DOC_DELAY = isTesting() ? 0 : 2000;

interface NewDocFormComponentSignature {
  Args: {
    docType: string;
  };
}

export default class NewDocFormComponent extends Component<NewDocFormComponentSignature> {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare documentTypes: DocumentTypesService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare modalAlerts: ModalAlertsService;
  @service declare router: RouterService;

  @tracked protected title: string = "";
  @tracked protected summary: string = "";
  @tracked protected productArea?: string;
  @tracked protected productAbbreviation: string | null = null;
  @tracked protected contributors: string[] = [];

  @tracked protected _form: HTMLFormElement | null = null;

  @tracked protected summaryIsLong = false;

  /**
   * Whether the document is being created, or in the process of
   * transitioning to the document screen after successful creation.
   * Used by the `New::Form` component for conditional rendering.
   * Set true when the createDoc task is running.
   * Reverted only if an error occurs.
   */
  @tracked protected docIsBeingCreated = false;

  /**
   * An object containing error messages for each applicable form field.
   */
  @tracked protected formErrors: DocFormErrors = {
    title: null,
    productAbbreviation: null,
  };

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

  protected get docTypeIcon() {
    return this.documentTypes.getFlightIcon(this.args.docType);
  }

  /**
   * Whether the form has errors.
   */
  private get hasErrors(): boolean {
    return Object.values(this.formErrors).some((error) => error !== null);
  }

  protected get buttonIsActive() {
    return !!this.title && !!this.productAbbreviation;
  }

  /**
   * Get workspace-aware button text for creating documents.
   * Returns "Create draft in Google Drive" for Google workspace,
   * or just "Create draft" for local workspace.
   */
  protected get createButtonText(): string {
    if (this.configSvc.config.workspace_provider === "google") {
      return "Create draft in Google Drive";
    }
    return "Create draft";
  }

  /**
   * Get workspace-aware task running headline.
   * Returns "Creating draft in Google Drive..." for Google workspace,
   * or just "Creating draft..." for local workspace.
   */
  protected get taskRunningHeadline(): string {
    if (this.configSvc.config.workspace_provider === "google") {
      return "Creating draft in Google Drive...";
    }
    return "Creating draft...";
  }

  /**
   * Validates the form if `validateEagerly` is true.
   */
  private maybeValidate() {
    if (this.validateEagerly) {
      this.validate();
    }
  }

  /**
   * Validates the form and updates the `formErrors` property.
   */
  private validate() {
    this.formErrors = {
      title: this.title ? null : "Title is required",
      productAbbreviation: this.productAbbreviation
        ? null
        : "Product/area is required",
    };
  }

  @action protected registerForm(form: HTMLFormElement) {
    this._form = form;
  }

  /**
   * Binds the FormData to our locally tracked properties.
   * Conditionally validates.
   */
  @action protected onKeydown(e: KeyboardEvent) {
    const formObject = Object.fromEntries(new FormData(this.form).entries());

    assert("title is missing from formObject", "title" in formObject);
    assert("summary is missing from formObject", "summary" in formObject);

    this.title = formObject["title"] as string;
    this.summary = formObject["summary"] as string;

    if (this.summary.length > 200) {
      this.summaryIsLong = true;
    } else {
      this.summaryIsLong = false;
    }

    if ("productArea" in formObject) {
      this.productArea = formObject["productArea"] as string;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      this.submit();
      return;
    }

    if (this.formErrors.title || this.formErrors.productAbbreviation) {
      // Validate once the input values are captured
      next("afterRender", () => {
        this.validate();
      });
    }

    this.maybeValidate();
  }

  /**
   * Updates the contributors property and conditionally validates the form.
   */
  @action protected updateContributors(contributors: string[]) {
    this.contributors = contributors;
  }

  @action protected onProductSelect(
    productName: string,
    attributes: ProductArea,
  ) {
    this.productArea = productName;
    this.productAbbreviation = attributes.abbreviation;
    this.maybeValidate();
  }

  /**
   * Validates the form, and, if valid, creates a document.
   * If the form is invalid, sets `validateEagerly` true.
   */
  @action protected submit(event?: SubmitEvent) {
    event?.preventDefault();
    this.validateEagerly = true;
    this.validate();
    if (!this.hasErrors) {
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
      const doc = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributors: this.contributors,
            docType: this.args.docType,
            product: this.productArea,
            productAbbreviation: this.productAbbreviation,
            summary: cleanString(this.summary),
            title: cleanString(this.title),
          }),
        })
        .then((response) => response?.json());

      // Wait for document to be available.
      await timeout(AWAIT_DOC_DELAY);

      this.router
        .transitionTo("authenticated.document", doc.id, {
          queryParams: { draft: true },
        })
        .then(() => {
          if (this.configSvc.config.create_docs_as_user) {
            this.flashMessages.success("", {
              title: "Draft created!",
            });
          } else {
            /**
             * If `create_docs_as_user` is false, show a modal alert
             * explaining the limitations on notifications.
             */
            this.modalAlerts.open(ModalType.DraftCreated);
          }
        });
    } catch (e) {
      this.docIsBeingCreated = false;

      this.flashMessages.critical((e as any).message, {
        title: "Error creating document draft",
      });
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::DocForm": typeof NewDocFormComponent;
  }
}
