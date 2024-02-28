import Component from "@glimmer/component";
import {
  RelatedHermesDocument,
  RelatedResource,
} from "hermes/components/related-resources";
import { assert } from "@ember/debug";

interface DocumentSidebarRelatedResourcesListItemResourceComponentSignature {
  Args: {
    resource: RelatedResource;
    removeResource: (resource: RelatedResource) => void;
  };
}

export default class DocumentSidebarRelatedResourcesListItemResourceComponent extends Component<DocumentSidebarRelatedResourcesListItemResourceComponentSignature> {
  /**
   * Whether the resource is a HermesDocument,
   * as measured by the googleFileID attribute.
   */
  protected get resourceIsDocument(): boolean {
    return "googleFileID" in this.args.resource;
  }

  /**
   * The docType of a definitely HermesDocument
   */
  protected get docType() {
    this.assertResourceIsDocument(this.args.resource);
    return this.args.resource.documentType;
  }

  /**
   * The docNumber of a definitely HermesDocument
   */
  protected get docNumber() {
    this.assertResourceIsDocument(this.args.resource);
    return this.args.resource.documentNumber;
  }

  /**
   * The title of the resource. Returns the `name` or `title` property,
   * depending on the type.
   */
  protected get title() {
    if ("name" in this.args.resource) {
      return this.args.resource.name;
    }
    return this.args.resource.title;
  }

  /**
   * The full URL of an ExternalResource
   */
  protected get url() {
    assert("url must exist in the resource", "url" in this.args.resource);
    return this.args.resource.url;
  }

  /**
   * The url to display in the ResourceList.
   * Strips the protocol, "www" and path.
   */
  protected get displayURL() {
    return this.url
      .replace(/(^\w+:|^)\/\//, "")
      .replace("www.", "")
      .split("/")[0];
  }

  /**
   * A method that asserts that a given resource is a Hermes Document.
   * Called in Hermes Document–specific getters to confirm we're working
   * with the correct data model.
   */
  private assertResourceIsDocument(
    document: RelatedResource,
  ): asserts document is RelatedHermesDocument {
    if (!("googleFileID" in document)) {
      throw new Error("resource must be a document");
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::RelatedResources::ListItem::Resource": typeof DocumentSidebarRelatedResourcesListItemResourceComponent;
  }
}
