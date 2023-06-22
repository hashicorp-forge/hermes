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

  @action showModal() {
    this.modalIsShown = true;
  }

  @action hideModal() {
    this.modalIsShown = false;
  }

  @action saveChanges() {
    assert("resource must have a URL value", "url" in this.args.resource);
    this.args.editResource(this.args.resource as RelatedExternalLink);
    this.hideModal();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::ListItem": typeof InputsDocumentSelectListItem;
  }
}
