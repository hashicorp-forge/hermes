import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import ActiveFiltersService from "hermes/services/active-filters";

interface HeaderActiveFilterListItemComponentSignature {
  Args: {
    filter: string;
  };
}

export default class HeaderActiveFilterListItemComponent extends Component<HeaderActiveFilterListItemComponentSignature> {
  @service declare activeFilters: ActiveFiltersService;
  @service declare router: RouterService;

  get query() {
    return Object.fromEntries(
      Object.entries(this.activeFilters.index).map(([key, value]) => [
        key,
        value.filter((filter) => filter !== this.args.filter),
      ])
    );
  }
}
