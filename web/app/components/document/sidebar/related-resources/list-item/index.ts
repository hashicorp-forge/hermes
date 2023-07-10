import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { assert } from "@ember/debug";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/document/sidebar/related-resources";

interface DocumentSidebarRelatedResourcesListItemComponentSignature {
  Element: HTMLLIElement;
  Args: {
    resource: RelatedHermesDocument | RelatedExternalLink;
    removeResource: (resource: HermesDocument | RelatedExternalLink) => void;
    editResource: (resource: RelatedExternalLink) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class DocumentSidebarRelatedResourcesListItemComponent extends Component<DocumentSidebarRelatedResourcesListItemComponentSignature> {
  @tracked modalIsShown = false;

  private _itemIsExternalResource = "url" in this.args.resource;

  protected get documentObjectID(): string | null {
    if ("googleFileID" in this.args.resource) {
      return (this.args.resource as RelatedHermesDocument).googleFileID;
    } else {
      return null;
    }
  }

  protected get externalResourceURL(): string {
    assert("external resource expected", this._itemIsExternalResource);
    return (this.args.resource as RelatedExternalLink).url;
  }

  protected get externalLink(): RelatedExternalLink {
    assert("external resource expected", this._itemIsExternalResource);
    return this.args.resource as RelatedExternalLink;
  }

  @action protected showModal() {
    this.modalIsShown = true;
  }

  @action protected hideModal() {
    this.modalIsShown = false;
  }

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
