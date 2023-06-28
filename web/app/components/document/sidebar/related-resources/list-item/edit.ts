import Component from "@glimmer/component";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesListItemEditComponentSignature {
  Args: {
    resource: RelatedExternalLink;
    hideModal: () => void;
    onSave: (resource: RelatedExternalLink) => void;
    // Temporary workaround until this is an attribute of the resource
    url: string;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemEditComponent extends Component<DocumentSidebarRelatedResourcesListItemEditComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Edit": typeof DocumentSidebarRelatedResourcesListItemEditComponent;
  }
}
