import Component from "@glimmer/component";

interface DocumentSidebarSectionHeaderComponentSignature {
  Element: HTMLDivElement;
  Args: {
    title: string;
    buttonLabel?: string;
    buttonAction?: () => void;
    buttonIcon?: string;
  };
}

export default class DocumentSidebarSectionHeaderComponent extends Component<DocumentSidebarSectionHeaderComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::SectionHeader": typeof DocumentSidebarSectionHeaderComponent;
  }
}
