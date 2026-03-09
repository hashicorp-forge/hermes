import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import type { RelatedExternalLink } from "hermes/components/related-resources";
import isValidURL from "hermes/utils/is-valid-u-r-l";
import { assert } from "@ember/debug";

interface RelatedResourcesAddOrEditExternalResourceModalComponentSignature {
  Args: {
    resource?: RelatedExternalLink;
    onClose: () => void;
    onSave: (resource: RelatedExternalLink) => void;
    removeResource?: (resource: RelatedExternalLink) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class RelatedResourcesAddOrEditExternalResourceModalComponent extends Component<RelatedResourcesAddOrEditExternalResourceModalComponentSignature> {
  @tracked protected shouldValidateEagerly = false;

  /**
   * A locally tracked URL property. Starts as the passed-in value;
   * updated when the URL input-value changes.
   */
  @tracked protected url = this.args.resource ? this.args.resource.url : "";

  /**
   * The title of the resource. If the name is the same as the URL,
   * we treat it like it's an empty value so the placeholder text shows.
   */
  @tracked protected title = !this.args.resource
    ? ""
    : this.args.resource.name === this.args.resource.url
    ? ""
    : this.args.resource.name;

  /**
   * Whether the URL is valid, as determined by the `isValidURL` utility.
   * Used to dictate whether an error message is shown.
   */
  @tracked protected urlIsValid = true;

  /**
   * Whether the error warning is shown.
   * True if the title is empty on submit.
   */
  @tracked protected titleErrorIsShown = false;

  /**
   * A local reference to the form element.
   * Registered when inserted.
   */
  @tracked private _form: HTMLFormElement | null = null;

  /**
   * An asserted-true reference to the form element.
   */
  protected get form(): HTMLFormElement {
    assert("this._form must exist", this._form);
    return this._form;
  }

  protected get removeResourceButtonIsShown() {
    return !!this.args.removeResource && !!this.args.resource;
  }

  protected get removeResource() {
    assert("this.args.removeResource must exist", this.args.removeResource);
    return this.args.removeResource;
  }

  protected get resource() {
    assert("this.args.resource must exist", this.args.resource);
    return this.args.resource;
  }

  /**
   * The action to register the form element locally.
   * Called when the form is rendered.
   */
  @action protected registerForm(form: HTMLFormElement): void {
    this._form = form;
  }

  /**
   * The action that updates the local form properties and eagerly validates the URL.
   * Runs on the "input" events of the URL and title inputs.
   */
  @action protected updateFormValues(): void {
    const formObject = Object.fromEntries(new FormData(this.form).entries());

    const title = formObject["title"];
    const url = formObject["url"];

    assert("title must be a string", typeof title === "string");
    assert("url must be a string", typeof url === "string");

    this.title = title;
    this.url = url;

    if (this.shouldValidateEagerly) {
      this.processURL();
    }
  }

  /**
   * The action that validates the locally tracked URL.
   * Updates the `urlIsValid` property, which is used to show
   * an error message for invalid URLs.
   */
  @action private processURL() {
    this.urlIsValid = isValidURL(this.url);
  }

  @action maybeSubmit(e: Event) {
    e.preventDefault();

    this.processURL();

    this.shouldValidateEagerly = true;

    if (!this.title) {
      this.titleErrorIsShown = true;
      return;
    }

    if (this.urlIsValid) {
      const sortOrder = this.args.resource ? this.args.resource.sortOrder : 1;

      this.args.onSave({
        url: this.url,
        name: this.title,
        sortOrder,
      });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResources::AddOrEditExternalResourceModal": typeof RelatedResourcesAddOrEditExternalResourceModalComponent;
  }
}
