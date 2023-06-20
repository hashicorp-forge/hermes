import { action } from "@ember/object";
import Component from "@glimmer/component";

interface DocumentRelatedResourceSignature {
  Args: {
    resource: any;
    removeResource: (resource: any) => void;
  };
}

export default class DocumentRelatedResource extends Component<DocumentRelatedResourceSignature> {
  @action removeResource() {
    this.args.removeResource(this.args.resource);
  }

  get faviconURL() {
    return "https://www.google.com/s2/favicons?domain=" + this.args.resource;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    'Document::RelatedResource': typeof DocumentRelatedResource;
  }
}
