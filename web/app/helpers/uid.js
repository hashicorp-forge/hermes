import { helper } from "@ember/component/helper";
import { guidFor } from "@ember/object/internals";

/*
 * Returns a unique id that contains the provided label and guid from the salt
 *
 * @salt: An object to generate a salt value from (using guidFor)
 * @label: A human-readable label
 *
 * @example
 * {{uid this "title"}}
 *
 * "title-ember123912"
 */
export default helper(([salt, label]) => {
  return `${label}-${guidFor(salt)}`;
});
