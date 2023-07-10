import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask } from "ember-concurrency";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";
import isValidURL from "hermes/utils/is-valid-u-r-l";

interface DocumentSidebarRelatedResourcesListItemEditComponentSignature {
  Args: {
    resource: RelatedExternalLink;
    hideModal: () => void;
    onSave: (resource: RelatedExternalLink) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemEditComponent extends Component<DocumentSidebarRelatedResourcesListItemEditComponentSignature> {
  @tracked resource = this.args.resource;

  @tracked url = this.args.resource.url;
  @tracked title = this.args.resource.title;

  @tracked errorMessageIsShown = false;

  @tracked _form: HTMLFormElement | null = null;

  @tracked urlIsValid = false;

  @action protected registerForm(form: HTMLFormElement): void {
    this._form = form;
  }

  protected get form(): HTMLFormElement {
    assert("this._form must exist", this._form);
    return this._form;
  }

  @action protected updateFormValues(): void {
    const formObject = Object.fromEntries(new FormData(this.form).entries());

    const title = formObject["title"];
    const url = formObject["url"];

    assert("title must be a string", typeof title === "string");
    assert("url must be a string", typeof url === "string");

    this.title = title;
    this.url = url;

    void this.validateURL.perform();
  }

  protected validateURL = restartableTask(async () => {
    this.urlIsValid = isValidURL(this.url);
    this.errorMessageIsShown = !this.urlIsValid;
  });

  protected onSave = restartableTask(async (e: Event) => {
    // prevent the form from submitting on enter
    e.preventDefault();

    let newResource = this.args.resource;
    newResource.url = this.url;
    newResource.title = this.title;

    await this.validateURL.perform();

    if (this.urlIsValid) {
      if (!this.args.resource.title.length) {
        newResource.title = this.url;
      }
      this.args.onSave(newResource);
    } else {
      this.errorMessageIsShown = true;
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Edit": typeof DocumentSidebarRelatedResourcesListItemEditComponent;
  }
}
