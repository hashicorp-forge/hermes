import { action } from "@ember/object";
import Component from "@glimmer/component";
import { RelatedHermesDocument, RelatedResource } from "..";
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

  assertResourceIsDocument(
    document: RelatedResource
  ): asserts document is RelatedHermesDocument {
    if (!("googleFileID" in document)) {
      throw new Error("resource must be a document");
    }
  }

  protected get iconName() {
    const resource = this.args.resource;
    assert("resource must be an external link", "url" in resource);
    const url = resource.url;

    const urlParts = url.split("/");
    let domain = urlParts[2];

    assert("domain must exist", domain);
    const domainParts = domain.split(".");

    domain = domainParts[domainParts.length - 2];

    if (domain) {
      if (domain.includes("figma")) {
        return "figma-color";
      }
      if (domain.includes("google")) {
        return "google-color";
      }
      if (domain.includes("datadog")) {
        return "datadog-color";
      }
      if (domain.includes("github")) {
        return "github-color";
      }
      if (domain.includes("codepen")) {
        return "codepen-color";
      }
      if (domain.includes("slack")) {
        return "slack-color";
      }
      if (domain.includes("loom")) {
        return "loom-color";
      }
    }

    return "external-link";
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
