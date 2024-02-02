import Component from "@glimmer/component";
import { DocFooterButton } from "../sidebar";

interface DocumentSidebarFooterComponentSignature {
  Element: HTMLDivElement;
  Args: {
    primaryButtonAttrs: DocFooterButton;
    secondaryButtonAttrs?: DocFooterButton;
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
