import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

const DEFAULT_ERROR = "This field is required";

interface AdminProductAreasSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminProductAreas extends Component<AdminProductAreasSignature> {
  @service declare productAreas: ProductAreasService;

  @tracked private formIsValid = false;

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

  /**
   *
   */
  @action protected setAbbreviation(event: Event): void {
    this.abbreviation = (event.target as HTMLInputElement).value;
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
      // should run some code
      console.log("Form is valid");
    } else {
      console.log("Form is not valid");
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::ProductAreas": typeof AdminProductAreas;
  }
}
