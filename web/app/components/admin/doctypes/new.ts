import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { dropTask, timeout } from "ember-concurrency";
import DocumentTypesService from "hermes/services/document-types";

interface AdminDoctypesNewSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminDoctypesNew extends Component<AdminDoctypesNewSignature> {
  @service declare documentTypes: DocumentTypesService;

  @tracked protected formIsSubmitting = false;
  @tracked protected successStateIsShown = false;

  @tracked protected longName = "";
  @tracked protected name = "";
  @tracked protected description = "";
  @tracked protected templateID = "";
  @tracked protected icon = "";

  @action protected resetState() {
    this.longName = "";
    this.name = "";
    this.description = "";
    this.templateID = "";
    this.icon = "";
    this.formIsSubmitting = false;
    this.successStateIsShown = false;
  }

  @action protected createDoctype(
    longName: string,
    name: string,
    description: string,
    templateID: string,
    icon: string,
  ) {
    this.longName = longName;
    this.name = name;
    this.description = description;
    this.templateID = templateID;
    this.icon = icon;

    void this.addDoctype.perform();
  }

  /**
   *
   */
  protected addDoctype = dropTask(async () => {
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
    "Admin::Doctypes::New": typeof AdminDoctypesNew;
  }
}
