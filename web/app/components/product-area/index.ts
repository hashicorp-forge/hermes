import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";

interface ProductAreaIndexComponentSignature {
  Element: null;
  Args: {
    productArea: string;
    docs: HermesDocument[];
    nbHits: number;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAreaIndexComponent extends Component<ProductAreaIndexComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  protected get isSubscribed() {
    return this.authenticatedUser.subscriptions?.some(
      (subscription) => subscription.productArea === this.args.productArea,
    );
  }

  protected get seeMoreButtonIsShown() {
    return this.args.nbHits > 12;
  }

  @action protected toggleSubscription() {
    if (this.isSubscribed) {
      void this.authenticatedUser.removeSubscription.perform(
        this.args.productArea,
      );
    } else {
      void this.authenticatedUser.addSubscription.perform(
        this.args.productArea,
      );
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductArea: typeof ProductAreaIndexComponent;
  }
}
