import Component from "@glimmer/component";
import { HITS_PER_PAGE } from "hermes/services/search";
import { HermesDocument } from "hermes/types/document";

interface ProductAreaIndexComponentSignature {
  Args: {
    productArea: string;
    docs: HermesDocument[];
    nbHits: number;
  };
}

export default class ProductAreaIndexComponent extends Component<ProductAreaIndexComponentSignature> {
  protected get seeMoreButtonIsShown() {
    return this.args.nbHits > HITS_PER_PAGE;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductArea: typeof ProductAreaIndexComponent;
  }
}
