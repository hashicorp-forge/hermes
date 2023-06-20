import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { RelatedExternalLink } from "../document-select";

interface InputsDocumentSelectMoreButtonSignature {
  Args: {
    resource: RelatedExternalLink | HermesDocument;
    removeResource: (resource: RelatedExternalLink | HermesDocument) => void;
    showEditAction?: boolean;
  };
}

export default class InputsDocumentSelectMoreButton extends Component<InputsDocumentSelectMoreButtonSignature> {
  @tracked popoverIsShown = false;

  @tracked trigger: HTMLElement | null = null;

  @action openPopover() {
    this.popoverIsShown = true;
  }

  @action hidePopover() {
    this.popoverIsShown = false;
  }

  @action togglePopover() {
    this.popoverIsShown = !this.popoverIsShown;
  }

  @action didInsertTrigger(e: HTMLElement): void {
    this.trigger = e;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::DocumentSelect::MoreButton": typeof InputsDocumentSelectMoreButton;
  }
}
