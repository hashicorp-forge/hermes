import { helper } from "@ember/component/helper";

/**
 * Supplies an empty object if no is query provided.
 * Avoids errors when passing empty `@query` values to LinkTos.
 * Workaround for https://github.com/emberjs/ember.js/issues/19693
 * Can be removed when we upgrade to Ember 3.28+
 */
export default helper(([query]: [unknown | undefined | null]) => {
  return query ? query : {};
});
