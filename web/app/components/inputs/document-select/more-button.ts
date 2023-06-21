import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { RelatedExternalLink } from "../document-select";
import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { next, schedule } from "@ember/runloop";
import { tracked } from "@glimmer/tracking";
import htmlElement from "hermes/utils/html-element";

interface InputsDocumentSelectMoreButtonSignature {
  Args: {
    resource: RelatedExternalLink | HermesDocument;
    removeResource: (resource: RelatedExternalLink | HermesDocument) => void;
    showEditAction?: boolean;
    onEdit?: () => void;
  };
}

export default class InputsDocumentSelectMoreButton extends Component<InputsDocumentSelectMoreButtonSignature> {
  get items() {
    let deleteItem = {
      delete: {
        label: "Delete",
        icon: "trash",
        action: this.removeResource,
      },
    };

    let maybeEditItem = null;

    if (this.args.showEditAction && this.args.onEdit) {
      maybeEditItem = {
        edit: {
          label: "Edit",
          icon: "edit",
          action: this.onEdit,
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

  @action onEdit() {
    assert("onEdit function must exist", this.args.onEdit);
    this.args.onEdit();
  }

  @action onAnchorClick(dd: any) {
    this.dd = dd;
    if (dd.contentIsShown) {
      dd.hideContent();
    } else {
      dd.showContent();
    }
  }

  @tracked dd = null;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::MoreButton": typeof InputsDocumentSelectMoreButton;
  }
}
