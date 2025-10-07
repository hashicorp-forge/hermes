import Helper from "@ember/component/helper";
import { service } from "@ember/service";
import ActiveFiltersService from "hermes/services/active-filters";

export interface IsActiveFilterSignature {
  Args: {
    Positional: [string];
  };
  Return: boolean;
}

export default class IsActiveFilterHelper extends Helper<IsActiveFilterSignature> {
  @service declare activeFilters: ActiveFiltersService;

  compute([positional]: IsActiveFilterSignature["Args"]["Positional"]) {
    const activeFilters = Object.values(this.activeFilters.index).flat();
    return activeFilters.some((values) => values.includes(positional));
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "is-active-filter": typeof IsActiveFilterHelper;
  }
}
