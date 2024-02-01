import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";

export interface DocumentSidebarFooterButton {
  text?: string;
  action?: () => void;
  actions?: { text: string; action: () => void; icon: string }[];
  isRunning?: boolean;
  icon?: string;
}

interface DocumentSidebarFooterComponentSignature {
  Element: HTMLDivElement;
  Args: {
    primaryButtonAttrs: DocumentSidebarFooterButton;
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
