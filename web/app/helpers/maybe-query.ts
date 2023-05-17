import { helper } from "@ember/component/helper";

export interface MaybeQuerySignature {
  Args: {
    Positional: [Record<string, unknown> | undefined];
  };
  Return: Record<string, unknown> | {};
}

/**
 * Supplies an empty object if no is query provided.
 * Avoids errors when passing empty `@query` values to LinkTos.
 * Workaround for https://github.com/emberjs/ember.js/issues/19693
 * Can be removed when we upgrade to Ember 4.0.
 */
const maybeQueryHelper = helper<MaybeQuerySignature>(
  ([query]: [unknown | undefined]) => {
    return query ? query : {};
  }
);

export default maybeQueryHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "maybe-query": typeof maybeQueryHelper;
  }
}
