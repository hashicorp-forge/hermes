import { action } from "@ember/object";
import Component from "@glimmer/component";

interface DocumentRelatedResourcesListItemSignature {
  Args: {
    resource: string;
    removeResource: (resource: string) => void;
  };
}

export default class DocumentRelatedResourcesListItem extends Component<DocumentRelatedResourcesListItemSignature> {
  @action removeResource() {
    this.args.removeResource(this.args.resource);
  }

  get faviconURL() {
    return "https://www.google.com/s2/favicons?domain=" + this.args.resource;
  }
}
