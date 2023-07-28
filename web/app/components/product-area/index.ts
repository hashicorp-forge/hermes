import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface ProductAreaComponentSignature {
  Args: {
    // TODO: Type this
    model: any;
  };
}

export default class ProductAreaComponent extends Component<ProductAreaComponentSignature> {
  @tracked protected isSubscribed = false;

  protected get tags() {
    return [
      { name: "RFC", facet: "docType" },
      { name: "PRD", facet: "docType" },
      { name: "FRD", facet: "docType" },
      { name: "In Review", facet: "status" },
      { name: "Approved", facet: "status" },
      { name: "Obsolete", facet: "status" },
    ];
  }

  @action toggleSubscribed() {
    this.isSubscribed = !this.isSubscribed;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductArea: typeof ProductAreaComponent;
  }
}
