import Component from "@glimmer/component";

export interface DocumentSidebarFooterButton {
  text?: string;
  action?: () => void;
  actions?: DocumentSidebarFooterOverflowItem[];
  isRunning?: boolean;
  icon?: string;
}

export interface DocumentSidebarFooterOverflowItem {
  text: string;
  action: () => void;
  icon: string;
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

export default class DocumentSidebarFooterComponent extends Component<DocumentSidebarFooterComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::Footer": typeof DocumentSidebarFooterComponent;
  }
}
