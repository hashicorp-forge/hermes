import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";

interface RowResultsComponentSignature {
  Args: {
    docs: HermesDocument[];
    isDraft?: boolean;
    nbPages?: number;
    currentPage?: number;
  };
}
export default class RowResultsComponent extends Component<RowResultsComponentSignature> {
  @service declare router: RouterService;

  protected get paginationIsShown() {
    return this.args.nbPages && this.args.currentPage !== undefined;
  }

  protected get ownerColumnIsShown() {
    return !this.router.currentRouteName.startsWith("authenticated.my");
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RowResults: typeof RowResultsComponent;
  }
}
