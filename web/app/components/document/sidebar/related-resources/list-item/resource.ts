import { action } from "@ember/object";
import Component from "@glimmer/component";
import {
  RelatedHermesDocument,
  RelatedResource,
} from "../../related-resources";
import { assert } from "@ember/debug";

interface DocumentSidebarRelatedResourcesListItemResourceComponentSignature {
  Args: {
    resource: RelatedResource;
    removeResource: (resource: RelatedResource) => void;
  };
}

export default class DocumentSidebarRelatedResourcesListItemResourceComponent extends Component<DocumentSidebarRelatedResourcesListItemResourceComponentSignature> {
  protected get resourceIsDocument(): boolean {
    return "googleFileID" in this.args.resource;
  }

  protected get docType() {
    this.assertResourceIsDocument(this.args.resource);
    return this.args.resource.type;
  }

  protected get docNumber() {
    this.assertResourceIsDocument(this.args.resource);
    return this.args.resource.documentNumber;
  }

  protected get title() {
    if ("url" in this.args.resource) {
      return this.args.resource.title || this.url;
    }
    return this.args.resource.title;
  }

  assertResourceIsDocument(
    document: RelatedResource
  ): asserts document is RelatedHermesDocument {
    if (!("googleFileID" in document)) {
      throw new Error("resource must be a document");
    }
  }

  protected get url() {
    assert("url must exist in the resource", "url" in this.args.resource);
    return this.args.resource.url;
  }

  @action protected removeResource(): void {
    this.args.removeResource(this.args.resource);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Resource": typeof DocumentSidebarRelatedResourcesListItemResourceComponent;
  }
}
