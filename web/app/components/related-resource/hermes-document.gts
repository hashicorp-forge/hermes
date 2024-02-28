import Component from "@glimmer/component";
import { RelatedHermesDocument, RelatedResource } from "../related-resources";
import { assert } from "@ember/debug";

interface RelatedResourceHermesDocumentComponentSignature {
  Args: {
    resource: RelatedResource;
  };
  Blocks: {
    default: [RelatedHermesDocument];
  };
}

export default class RelatedResourceHermesDocumentComponent extends Component<RelatedResourceHermesDocumentComponentSignature> {
  protected get document(): RelatedHermesDocument {
    assert(
      "googleFileID must exist on the resource",
      "googleFileID" in this.args.resource,
    );
    return this.args.resource as RelatedHermesDocument;
  }

  <template>
    {{yield this.document}}
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResource::HermesDocument": typeof RelatedResourceHermesDocumentComponent;
  }
}
