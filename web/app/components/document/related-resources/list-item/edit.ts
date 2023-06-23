import Component from "@glimmer/component";
import { RelatedExternalLink } from "hermes/components/document/related-resources";

interface DocumentRelatedResourcesListItemEditComponentSignature {
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

export default class DocumentRelatedResourcesListItemEditComponent extends Component<DocumentRelatedResourcesListItemEditComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::RelatedResources::ListItem::Edit": typeof DocumentRelatedResourcesListItemEditComponent;
  }
}
