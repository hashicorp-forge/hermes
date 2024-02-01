import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { HdsButtonColor } from "hds/_shared";
import { HermesDocument } from "hermes/types/document";

export interface DocumentSidebarFooterButton {
  text?: string;
  action?: () => void;
  actions?: { text: string; action: () => void; icon: string }[];
  isRunning?: boolean; // primary only
  icon?: string; // secondary only
  isIconOnly?: boolean; // secondary only
}

interface DocumentSidebarFooterComponentSignature {
  Element: HTMLDivElement;
  Args: {
    primaryButtonAttrs?: DocumentSidebarFooterButton;
    secondaryButtonAttrs?: DocumentSidebarFooterButton;
    isReadOnly?: boolean;
    docIsLocked?: boolean;
    icon?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarFooterComponent extends Component<DocumentSidebarFooterComponentSignature> {
  @action protected secondaryAction() {
    const { secondaryButtonAttrs } = this.args;
    assert("secondary action must be defined", secondaryButtonAttrs);
    secondaryButtonAttrs.action?.();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::Footer": typeof DocumentSidebarFooterComponent;
  }
}
