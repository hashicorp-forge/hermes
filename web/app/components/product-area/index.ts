import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import FlagsService from "hermes/services/flags";
import { HermesDocument } from "hermes/types/document";

interface ProductAreaIndexComponentSignature {
  Args: {
    productArea: string;
    docs: HermesDocument[];
    nbHits: number;
  };
}

export default class ProductAreaIndexComponent extends Component<ProductAreaIndexComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flags: FlagsService;

  protected get seeMoreButtonIsShown() {
    return this.args.nbHits > 12;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductArea: typeof ProductAreaIndexComponent;
  }
}
