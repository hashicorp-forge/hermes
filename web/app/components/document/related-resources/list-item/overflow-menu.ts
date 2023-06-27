import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { action } from "@ember/object";
import { RelatedExternalLink } from "hermes/components/document/related-resources";

interface DocumentRelatedResourcesListItemOverflowMenuComponentSignature {
  Args: {
    resource: RelatedExternalLink | HermesDocument;
    showEditAction?: boolean;
    onRemoveClick: (resource: RelatedExternalLink | HermesDocument) => void;
    onEditClick?: () => void;
  };
}

export default class DocumentRelatedResourcesListItemOverflowMenuComponent extends Component<DocumentRelatedResourcesListItemOverflowMenuComponentSignature> {
  get items() {
    let maybeEditItem = null;

    if ("url" in this.args.resource && this.args.onEditClick) {
      maybeEditItem = {
        edit: {
          label: "Edit",
          icon: "edit",
          action: this.args.onEditClick,
        },
      };
    }

    const deleteItem = {
      delete: {
        label: "Remove",
        icon: "trash",
        action: this.removeResource,
      },
    };

    return {
      ...maybeEditItem,
      ...deleteItem,
    };
  }

  @action removeResource() {
    this.args.onRemoveClick(this.args.resource);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::RelatedResources::ListItem::OverflowMenu": typeof DocumentRelatedResourcesListItemOverflowMenuComponent;
  }
}