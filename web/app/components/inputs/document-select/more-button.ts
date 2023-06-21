import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { RelatedExternalLink } from "../document-select";
import { assert } from "@ember/debug";
import { action } from "@ember/object";

interface InputsDocumentSelectMoreButtonSignature {
  Args: {
    resource: RelatedExternalLink | HermesDocument;
    removeResource: (resource: RelatedExternalLink | HermesDocument) => void;
    showEditAction?: boolean;
    editResource?: (resource: RelatedExternalLink) => void;
  };
}

export default class InputsDocumentSelectMoreButton extends Component<InputsDocumentSelectMoreButtonSignature> {
  get items() {
    let deleteItem = {
      delete: {
        label: "Remove",
        icon: "trash",
        action: this.removeResource,
      },
    };

    let maybeEditItem = null;

    if ("url" in this.args.resource && this.args.editResource) {
      maybeEditItem = {
        edit: {
          label: "Edit",
          icon: "edit",
          action: this.editResource,
        },
      };
    }

    return {
      ...maybeEditItem,
      ...deleteItem,
    };
  }

  @action removeResource() {
    this.args.removeResource(this.args.resource);
  }

  @action editResource() {
    assert("editResource function must exist", this.args.editResource);
    assert('resource must have "url" property', "url" in this.args.resource);

    this.args.editResource(this.args.resource as RelatedExternalLink);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::MoreButton": typeof InputsDocumentSelectMoreButton;
  }
}
