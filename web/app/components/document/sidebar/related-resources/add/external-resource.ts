import Component from "@glimmer/component";

interface DocumentSidebarRelatedResourcesAddExternalResourceSignature {
  Element: null;
  Args: {
    title: string;
    url: string;
    onSubmit: (e: Event) => void;
    onInput: (e: Event) => void;
    linkIsDuplicate?: boolean;
    titleErrorIsShown?: boolean;
  };
}

export default class DocumentSidebarRelatedResourcesAddExternalResource extends Component<DocumentSidebarRelatedResourcesAddExternalResourceSignature> {
  /**
   * Whether an error message should be shown.
   * True if the title is empty or the URL is a duplicate.
   */
  get errorIsShown() {
    return this.args.titleErrorIsShown || this.args.linkIsDuplicate;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add::ExternalResource": typeof DocumentSidebarRelatedResourcesAddExternalResource;
  }
}
