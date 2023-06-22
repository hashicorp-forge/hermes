import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { RelatedExternalLink } from ".";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { assert } from "@ember/debug";

interface InputsDocumentSelectListItemSignature {
  Element: HTMLLIElement;
  Args: {
    resource: HermesDocument | RelatedExternalLink;
    removeResource: (resource: HermesDocument | RelatedExternalLink) => void;
    editResource: (resource: RelatedExternalLink) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class InputsDocumentSelectListItem extends Component<InputsDocumentSelectListItemSignature> {
  @tracked modalIsShown = false;

  private _itemIsExternalResource = "url" in this.args.resource;

  protected get documentObjectID(): string | null {
    if ("objectID" in this.args.resource) {
      return (this.args.resource as HermesDocument).objectID;
    } else {
      return null;
    }
  }

  protected get externalResourceURL(): string {
    assert("external resource expected", this._itemIsExternalResource);
    return (this.args.resource as RelatedExternalLink).url;
  }

  @action protected showModal() {
    this.modalIsShown = true;
  }

  @action protected hideModal() {
    this.modalIsShown = false;
  }

  @action protected saveChanges() {
    assert(
      "only external resources can be saved",
      this._itemIsExternalResource
    );
    this.args.editResource(this.args.resource as RelatedExternalLink);
    this.hideModal();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::ListItem": typeof InputsDocumentSelectListItem;
  }
}
