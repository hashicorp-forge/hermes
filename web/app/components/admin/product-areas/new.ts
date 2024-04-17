import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { dropTask, timeout } from "ember-concurrency";

interface AdminProductAreasNewSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminProductAreasNew extends Component<AdminProductAreasNewSignature> {
  @tracked protected formIsSubmitting = false;
  @tracked protected successStateIsShown = false;

  @tracked protected name = "";
  @tracked protected abbreviation = "";
  @tracked protected color: string | null = null;

  @action protected resetState() {
    this.name = "";
    this.abbreviation = "";
    this.color = null;
    this.formIsSubmitting = false;
    this.successStateIsShown = false;
  }

  @action protected createProductArea(
    name: string,
    abbreviation: string,
    color: string | null,
  ) {
    this.name = name;
    this.abbreviation = abbreviation;

    if (color) {
      this.color = color;
    }

    void this.addProductArea.perform();
  }

  /**
   *
   */
  protected addProductArea = dropTask(async () => {
    try {
      this.formIsSubmitting = true;
      await timeout(2000);
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
