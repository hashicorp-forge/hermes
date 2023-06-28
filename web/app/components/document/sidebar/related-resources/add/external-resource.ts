import Component from "@glimmer/component";

interface DocumentSidebarRelatedResourcesAddExternalResourceSignature {
  Element: null;
  Args: {
    editModeIsEnabled: boolean;
    title: string;
    url: string;
    defaultFaviconIsShown: boolean;
    faviconURL: string | null;
    onSubmit: () => void;
    onInput: (e: Event) => void;
  };
}

export default class DocumentSidebarRelatedResourcesAddExternalResource extends Component<DocumentSidebarRelatedResourcesAddExternalResourceSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::Add::ExternalResource": typeof DocumentSidebarRelatedResourcesAddExternalResource;
  }
}
