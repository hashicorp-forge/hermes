import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

interface AdminProductAreasSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

export default class AdminProductAreas extends Component<AdminProductAreasSignature> {
  //  Looped through in the template
  @service declare productAreas: ProductAreasService;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Admin::ProductAreas": typeof AdminProductAreas;
  }
}
