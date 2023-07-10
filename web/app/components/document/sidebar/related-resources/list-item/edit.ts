import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesListItemEditComponentSignature {
  Args: {
    resource: RelatedExternalLink;
    hideModal: () => void;
    onSave: (resource: RelatedExternalLink) => void;
    // Temporary workaround until this is an attribute of the resource
    url: string;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemEditComponent extends Component<DocumentSidebarRelatedResourcesListItemEditComponentSignature> {
  @tracked resource = this.args.resource;

  @tracked url = this.args.url;
  @tracked title = this.args.resource.title;

  @tracked _form: HTMLFormElement | null = null;

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
  }

  @action protected onSave(): void {
    let newResource = this.args.resource;
    newResource.url = this.url;
    newResource.title = this.title;

    this.args.onSave(newResource);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Edit": typeof DocumentSidebarRelatedResourcesListItemEditComponent;
  }
}
