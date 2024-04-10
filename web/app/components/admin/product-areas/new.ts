import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";
import { dropTask, timeout } from "ember-concurrency";

const DEFAULT_ERROR = "This field is required";

interface AdminProductAreasNewSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminProductAreasNew extends Component<AdminProductAreasNewSignature> {
  @service declare productAreas: ProductAreasService;

  @tracked protected formIsValid = false;

  @tracked protected formIsSubmitting = false;

  @tracked protected successStateIsShown = false;

  /**
   *
   */
  @tracked protected name = "";

  /**
   *
   */
  @tracked protected nameErrorText = "";

  /**
   *
   */
  @tracked protected nameErrorIsShown = false;

  /**
   *
   */
  @tracked protected abbreviation = "";

  /**
   *
   */
  @tracked protected abbreviationErrorText = "";

  /**
   *
   */
  @tracked protected abbreviationErrorIsShown = false;

  /**
   *
   */
  @action protected setName(event: Event): void {
    this.name = (event.target as HTMLInputElement).value;
    this.checkForDuplicateName();
  }
  /**
   *
   */
  private checkForDuplicateName(): void {
    const lowercaseNames = this.productAreas.names.map((name) =>
      name.toLowerCase(),
    );
    const lowercaseName = this.name.toLowerCase();

    if (lowercaseNames.includes(lowercaseName)) {
      this.nameErrorText = "This product area already exists";
      this.nameErrorIsShown = true;
    } else {
      this.nameErrorIsShown = false;
    }
  }

  @action protected resetState() {
    this.name = "";
    this.nameErrorText = "";
    this.nameErrorIsShown = false;
    this.abbreviation = "";
    this.abbreviationErrorText = "";
    this.abbreviationErrorIsShown = false;
    this.formIsValid = false;
    this.successStateIsShown = false;
    // TODO: autofocus the name input
  }

  /**
   *
   */
  @action protected setAbbreviation(event: Event): void {
    this.abbreviation = (event.target as HTMLInputElement).value
      .toUpperCase()
      .replace(/\s/g, "");
    this.checkForDuplicateAbbreviation();
  }

  @action private validateForm(): void {
    if (this.name === "" || this.abbreviation === "") {
      if (this.name === "") {
        this.nameErrorText = DEFAULT_ERROR;
        this.nameErrorIsShown = true;
      }
      if (this.abbreviation === "") {
        this.abbreviationErrorText = DEFAULT_ERROR;
        this.abbreviationErrorIsShown = true;
      }
      this.formIsValid = false;
    } else {
      this.checkForDuplicateName();
      this.checkForDuplicateAbbreviation();
      if (this.nameErrorIsShown || this.abbreviationErrorIsShown) {
        this.formIsValid = false;
      } else {
        this.formIsValid = true;
      }
    }
  }

  /**
   *
   */
  private checkForDuplicateAbbreviation(): void {
    const lowercaseAbbreviations = this.productAreas.abbreviations.map((name) =>
      name.toLowerCase(),
    );
    const lowercaseAbbreviation = this.abbreviation.toLowerCase();

    if (lowercaseAbbreviations.includes(lowercaseAbbreviation)) {
      this.abbreviationErrorText = "This abbreviation already exists";
      this.abbreviationErrorIsShown = true;
    } else {
      this.abbreviationErrorIsShown = false;
    }
  }

  /**
   *
   */
  @action protected submit(e: SubmitEvent): void {
    e.preventDefault();
    this.validateForm();

    if (this.formIsValid) {
      this.formIsSubmitting = true;
      void this.addProductArea.perform();
    }
  }

  /**
   *
   */
  protected addProductArea = dropTask(async () => {
    try {
      this.formIsSubmitting = true;
      await timeout(1000);
      // show success state
      this.successStateIsShown = true;
    } catch {
      // handle error
    } finally {
      this.formIsSubmitting = false;
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::ProductAreas::New": typeof AdminProductAreasNew;
  }
}
