import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { HdsButtonColor } from "hds/_shared";
import { HermesDocument } from "hermes/types/document";

export interface DocumentSidebarFooterButton {
  text: string;
  color?: HdsButtonColor;
  action: () => void;
  isDisabled?: boolean;
  icon?: string;
}

interface DocumentSidebarFooterComponentSignature {
  Element: HTMLDivElement;
  Args: {
    primaryButtonAttrs: DocumentSidebarFooterButton;
    secondaryButtonAttrs?: DocumentSidebarFooterButton;
    controlsAreDisabled?: boolean;
    secondaryButtonIsShown?: boolean;
    docIsLocked?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarFooterComponent extends Component<DocumentSidebarFooterComponentSignature> {
  @action protected secondaryAction() {
    const { secondaryButtonAttrs } = this.args;
    assert("secondary action must be defined", secondaryButtonAttrs);
    secondaryButtonAttrs.action();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::Footer": typeof DocumentSidebarFooterComponent;
  }
}
