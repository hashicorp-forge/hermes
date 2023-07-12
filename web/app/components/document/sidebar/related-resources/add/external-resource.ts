import { action } from "@ember/object";
import Component from "@glimmer/component";

interface DocumentSidebarRelatedResourcesAddExternalResourceSignature {
  Element: null;
  Args: {
    urlIsLoading: boolean;
    title: string;
    url: string;
    onSubmit: () => void;
    onInput: (e: Event) => void;
    linkIsDuplicate?: boolean;
  };
}

export default class DocumentSidebarRelatedResourcesAddExternalResource extends Component<DocumentSidebarRelatedResourcesAddExternalResourceSignature> {
  @action onSubmit() {
    if (!this.args.linkIsDuplicate) {
      this.args.onSubmit();
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add::ExternalResource": typeof DocumentSidebarRelatedResourcesAddExternalResource;
  }
}
