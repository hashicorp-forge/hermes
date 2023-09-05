import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";
import isValidURL from "hermes/utils/is-valid-u-r-l";

interface DocumentSidebarRelatedResourcesListItemEditComponentSignature {
  Args: {
    resource?: RelatedExternalLink;
    hideModal: () => void;
    onSave: (resource: RelatedExternalLink) => void;
    removeResource?: (resource: RelatedExternalLink) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemEditComponent extends Component<DocumentSidebarRelatedResourcesListItemEditComponentSignature> {
  /**
   * A locally tracked URL property. Starts as the passed-in value;
   * updated when the URL input-value changes.
   */
  @tracked protected url = this.args.resource?.url ?? "";

  /**
   * The title of the resource. If the name is the same as the URL,
   * we treat it like it's an empty value so the placeholder text shows.
   */
  @tracked protected title =
    this.args.resource?.name === this.args.resource?.url
      ? ""
      : this.args.resource?.name ?? "";

  /**
   * Whether the error warning is shown.
   * True when the URL is invalid.
   */
  @tracked protected urlErrorMessageIsShown = false;

  /**
   * Whether the error warning is shown.
   * True if the title is empty on submit.
   */
  @tracked protected titleErrorMessageIsShown = false;

  /**
   * A local reference to the form element.
   * Registered when inserted.
   */
  @tracked private _form: HTMLFormElement | null = null;

  /**
   * Whether the URL is valid, as determined by the `isValidURL` utility.
   * Used to dictate whether an error message is shown.
   */
  @tracked protected urlIsValid = true;

  /**
   * The action to register the form element locally.
   * Called when the form is rendered.
   */
  @action protected registerForm(form: HTMLFormElement): void {
    this._form = form;
  }

  /**
   * An asserted-true reference to the form element.
   */
  protected get form(): HTMLFormElement {
    assert("this._form must exist", this._form);
    return this._form;
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

    this.validateURL();
  }

  /**
   * The action that validates the locally tracked URL.
   * Updates the `urlIsValid` property, which is used to show
   * an error message for invalid URLs.
   */
  @action private validateURL() {
    this.urlIsValid = isValidURL(this.url);
  }
  /**
   * The action called to save the resource if its URL is valid.
   * Formats the resource and calls the passed-in `onSave` action.
   */
  @action protected maybeSaveResource(e: Event) {
    // prevent the form from submitting on enter
    e.preventDefault();

    let newResource: RelatedExternalLink = {
      name: "",
      url: "",
      sortOrder: 0,
    };

    if (this.args.resource) {
      newResource = this.args.resource;
    }

    newResource.url = this.url;
    newResource.name = this.title;

    this.validateURL();

    if (!this.title) {
      this.titleErrorMessageIsShown = true;
      return;
    }

    if (this.urlIsValid) {
      this.args.onSave(newResource);
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Edit": typeof DocumentSidebarRelatedResourcesListItemEditComponent;
  }
}
