import Component from "@glimmer/component";
import { action } from "@ember/object";
import { RelatedResource } from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesListItemOverflowMenuComponentSignature {
  Args: {
    resource: RelatedResource;
    onRemoveClick: (resource: RelatedResource) => void;
    onEditClick?: () => void;
  };
}

export default class DocumentSidebarRelatedResourcesListItemOverflowMenuComponent extends Component<DocumentSidebarRelatedResourcesListItemOverflowMenuComponentSignature> {
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
    "Document::Sidebar::RelatedResources::ListItem::OverflowMenu": typeof DocumentSidebarRelatedResourcesListItemOverflowMenuComponent;
  }
}
