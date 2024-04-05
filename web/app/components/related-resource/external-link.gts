import Component from "@glimmer/component";
import { RelatedExternalLink, RelatedResource } from "../related-resources";
import { assert } from "@ember/debug";

interface RelatedResourceExternalLinkComponentSignature {
  Args: {
    resource: RelatedResource;
  };
  Blocks: {
    default: [RelatedExternalLink];
  };
}

export default class RelatedResourceExternalLinkComponent extends Component<RelatedResourceExternalLinkComponentSignature> {
  protected get link(): RelatedExternalLink {
    assert("url must exist on the resource", "url" in this.args.resource);
    return this.args.resource as RelatedExternalLink;
  }

  <template>
    {{yield this.link}}
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResource::ExternalLink": typeof RelatedResourceExternalLinkComponent;
  }
}
