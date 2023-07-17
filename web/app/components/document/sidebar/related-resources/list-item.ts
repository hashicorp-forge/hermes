import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { assert } from "@ember/debug";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
  RelatedResource,
} from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesListItemComponentSignature {
  Element: HTMLLIElement;
  Args: {
    resource: RelatedHermesDocument | RelatedExternalLink;
    removeResource: (resource: RelatedResource) => void;
    editResource: (resource: RelatedExternalLink) => void;
    editingIsDisabled?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemComponent extends Component<DocumentSidebarRelatedResourcesListItemComponentSignature> {
  /**
   * Whether the overflow modal is shown.
   */
  @tracked modalIsShown = false;

  /**
   * Whether the item is an external resource, as determined by its "url" property.
   * Used in assertions that deal explicitly with ExternalResources.
   */
  private _itemIsExternalResource = "url" in this.args.resource;

  /**
   * The resource's googleFileID, if it exists.
   * Used in the template to determine internal or external routing.
   */
  protected get documentObjectID(): string | null {
    if ("googleFileID" in this.args.resource) {
      return (this.args.resource as RelatedHermesDocument).googleFileID;
    } else {
      return null;
    }
  }

  /**
   * The asserted-true external resource URL.
   * Used to satisfy Glint template types.
   */
  protected get externalResourceURL(): string {
    assert("external resource expected", this._itemIsExternalResource);
    return (this.args.resource as RelatedExternalLink).url;
  }

  /**
   * The asserted-true external link.
   * Used to satisfy Glint template types.
   */
  protected get externalLink(): RelatedExternalLink {
    assert("external resource expected", this._itemIsExternalResource);
    return this.args.resource as RelatedExternalLink;
  }

  /**
   * The action that opens the modal. Called when "edit" is clicked
   * in the overflow menu.
   */
  @action protected showModal() {
    this.modalIsShown = true;
  }

  /**
   * The action called when the user dismisses the modal.
   */
  @action protected hideModal() {
    this.modalIsShown = false;
  }

  /**
   * The action when the user saves an external resource.
   * Calls the parent action and closes the modal.
   */
  @action protected saveChanges(resource: RelatedExternalLink) {
    this.args.editResource(resource);
    this.hideModal();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem": typeof DocumentSidebarRelatedResourcesListItemComponent;
  }
}
