import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";

interface PaginationLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    disabled?: boolean;
    icon?: string;
    page: string;
  };
}

export default class PaginationLinkComponent extends Component<PaginationLinkComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }
}
