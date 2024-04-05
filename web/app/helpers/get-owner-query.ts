import Helper from "@ember/component/helper";
import { DEFAULT_FILTERS } from "hermes/services/active-filters";

interface GetOwnerQueryHelperSignature {
  Args: {
    Positional: [email: string | undefined];
  };
  Return: Record<string, unknown>;
}
/**
 * Generates a query hash filtering to a specific owner.
 * Used in templates to make owners clickable.
 */
export default class GetOwnerQueryHelper extends Helper<GetOwnerQueryHelperSignature> {
  compute(positional: GetOwnerQueryHelperSignature["Args"]["Positional"]) {
    const owner = positional[0];
    if (owner) {
      return {
        ...DEFAULT_FILTERS,
        owners: [owner],
        page: 1,
      };
    } else {
      return {};
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-owner-query": typeof GetOwnerQueryHelper;
  }
}
