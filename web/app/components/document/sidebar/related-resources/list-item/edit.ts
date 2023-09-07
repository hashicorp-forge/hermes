import { action } from "@ember/object";
import { guidFor } from "@ember/object/internals";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { RelatedExternalLink } from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesListItemEditComponentSignature {
  Args: {
    resource: RelatedExternalLink;
    hideModal: () => void;
    onSave: (resource: RelatedExternalLink) => void;
    removeResource: (resource: RelatedExternalLink) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemEditComponent extends Component<DocumentSidebarRelatedResourcesListItemEditComponentSignature> {
  protected id = guidFor(this);
  protected bodyID = `${this.id}-body`;
  protected submitID = `${this.id}-submit`;

  protected bodySelector = `#${this.bodyID}`;
  protected submitSelector = `#${this.submitID}`;

  @tracked protected formIsRendered = false;

  @action protected renderForm() {
    this.formIsRendered = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Edit": typeof DocumentSidebarRelatedResourcesListItemEditComponent;
  }
}
