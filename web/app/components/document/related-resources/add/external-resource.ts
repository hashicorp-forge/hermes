import Component from "@glimmer/component";

interface DocumentRelatedResourcesAddExternalResourceSignature {
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

export default class DocumentRelatedResourcesAddExternalResource extends Component<DocumentRelatedResourcesAddExternalResourceSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::RelatedResources::Add::ExternalResource": typeof DocumentRelatedResourcesAddExternalResource;
  }
}
