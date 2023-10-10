import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import or from "ember-truth-helpers/helpers/or";
import ProductAvatar from "hermes/components/product/avatar";

interface ProductComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    name?: string;
    avatarIsHidden?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductComponent extends Component<ProductComponentSignature> {
  @service declare router: RouterService;

  <template>
    <div data-test-product class="relative inline-flex items-center gap-2">
      {{#unless this.args.avatarIsHidden}}
        <ProductAvatar @product={{@name}} />
      {{/unless}}
      <span class="name">
        {{or this.args.name "Unknown"}}
      </span>
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Product: typeof ProductComponent;
  }
}
